import { type } from 'arktype';
import { TeyvatApiError, TeyvatResponseValidationError } from '#/client/errors.ts';
import type { TeyvatHttpClient } from '#/client/request.ts';
import { TEYVAT_DOMAINS } from '#/consts/domains.ts';
import { _hoyolabHeaders } from '#/endpoints/hoyolab/headers.ts';
import type { TeyvatCheckInCaptchaSolution } from '#/types/check_in.ts';

const ACTIVITY_ID = 'e202102251931481';
const CLAIM_ENDPOINT = '/event/sol/sign';

const schemaHoyolabCheckInInfoResponse = type({
	retcode: 'number.integer',
	message: 'string',
	data: {
		['is_sign']: 'boolean',
		['total_sign_day']: 'number.integer >= 0',
	},
});

const schemaHoyolabCheckInRewardsResponse = type({
	retcode: 'number.integer',
	message: 'string',
	data: {
		awards: type({
			name: 'string',
			cnt: 'number.integer >= 0',
			icon: 'string',
		}).array(),
	},
});

const schemaHoyolabCheckInHistoryResponse = type({
	retcode: 'number.integer',
	message: 'string',
	data: {
		list: type({
			id: 'number.integer >= 0',
			name: 'string',
			cnt: 'number.integer >= 0',
			img: 'string',
			['created_at']: 'string',
		}).array(),
	},
});

const schemaHoyolabCheckInClaimEnvelope = type({
	retcode: 'number.integer',
	message: 'string',
	data: 'object | null',
});

const schemaHoyolabCheckInCaptcha = type({
	['risk_code']: 'number.integer',
	gt: 'string',
	challenge: 'string',
	success: 'number.integer',
});

export type HoyolabCheckInCaptcha = typeof schemaHoyolabCheckInCaptcha.infer;
export type HoyolabCheckInClaimResult =
	| { status: 'claimed' }
	| { status: 'already_claimed' }
	| { status: 'captcha_required'; captcha: HoyolabCheckInCaptcha };

function _params(client: TeyvatHttpClient): Record<string, string> {
	return { ['act_id']: ACTIVITY_ID, lang: client.language };
}

function _headers(client: TeyvatHttpClient): Headers {
	return new Headers({
		..._hoyolabHeaders(client.language),
		['Referer']: 'https://act.hoyolab.com/',
		'x-rpc-signgame': 'hk4e',
	});
}

export async function _getHoyolabCheckInInfo(client: TeyvatHttpClient) {
	return await client.request({
		domain: TEYVAT_DOMAINS.genshinCheckIn,
		path: 'info',
		params: _params(client),
		headers: _headers(client),
		schema: schemaHoyolabCheckInInfoResponse,
	});
}

export async function _getHoyolabCheckInRewards(client: TeyvatHttpClient) {
	return await client.request({
		domain: TEYVAT_DOMAINS.genshinCheckIn,
		path: 'home',
		params: _params(client),
		headers: _headers(client),
		schema: schemaHoyolabCheckInRewardsResponse,
	});
}

export async function _getHoyolabCheckInHistoryPage(client: TeyvatHttpClient, page: number) {
	return await client.request({
		domain: TEYVAT_DOMAINS.genshinCheckIn,
		path: 'award',
		params: { ..._params(client), ['current_page']: page },
		headers: _headers(client),
		schema: schemaHoyolabCheckInHistoryResponse,
	});
}

function _captcha(data: object): HoyolabCheckInCaptcha | undefined {
	const candidate =
		'gt_result' in data && typeof data.gt_result === 'object' && data.gt_result !== null ? data.gt_result : data;
	const validated = schemaHoyolabCheckInCaptcha(candidate);
	if (validated instanceof type.errors) return undefined;
	if (validated.risk_code === 0 || validated.success === 0 || !validated.gt || !validated.challenge) return undefined;
	return validated;
}

export async function _claimHoyolabCheckIn(
	client: TeyvatHttpClient,
	solution?: TeyvatCheckInCaptchaSolution,
): Promise<HoyolabCheckInClaimResult> {
	const headers = _headers(client);
	if (solution) {
		headers.set('x-rpc-challenge', solution.geetestChallenge);
		headers.set('x-rpc-validate', solution.geetestValidate);
		headers.set('x-rpc-seccode', solution.geetestSeccode);
	}
	const response = await client.authenticatedRawRequest(
		{
			domain: TEYVAT_DOMAINS.genshinCheckIn,
			path: 'sign',
			method: 'POST',
			params: _params(client),
			headers,
		},
		true,
	);

	let envelope: typeof schemaHoyolabCheckInClaimEnvelope.infer;
	try {
		envelope = schemaHoyolabCheckInClaimEnvelope.assert(response.data);
	} catch {
		throw new TeyvatResponseValidationError('POST', CLAIM_ENDPOINT, ['invalid daily check-in response']);
	}
	if (envelope.data) {
		const captcha = _captcha(envelope.data);
		if (captcha) return { status: 'captcha_required', captcha };
	}
	if (envelope.retcode === -5003) return { status: 'already_claimed' };
	if (envelope.retcode !== 0) throw new TeyvatApiError(envelope.retcode, envelope.message, 'POST', CLAIM_ENDPOINT);
	return { status: 'claimed' };
}
