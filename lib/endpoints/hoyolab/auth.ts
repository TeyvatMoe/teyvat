import { type Type, type } from 'arktype';
import { _generateAppLoginDs, _generateAppTokenDs } from '#/auth/ds.ts';
import { TeyvatApiError, TeyvatResponseValidationError } from '#/client/errors.ts';
import type { TeyvatHttpClient } from '#/client/request.ts';
import { TEYVAT_DOMAINS } from '#/consts/domains.ts';
import type { TeyvatAuthCaptchaSolution } from '#/types/auth.ts';

const APP_ID = 'c9oqaq3s3gu8';
const APP_VERSION = '4.8.0';
const SDK_VERSION = '2.2.0';

const schemaEnvelope = type({ retcode: 'number.integer', message: 'string', data: 'unknown' });
const schemaLoginSuccess = type({
	retcode: '0',
	message: 'string',
	data: {
		token: { token: 'string' },
		['user_info']: { aid: 'string', mid: 'string' },
	},
});
const schemaAigis = type({ ['session_id']: 'string', data: 'unknown' });
const schemaCaptchaV3 = type({
	gt: 'string',
	challenge: 'string',
	['new_captcha']: 'number.integer',
	success: 'number.integer',
});
const schemaCaptchaV4 = type({
	gt: 'string',
	['risk_type']: 'string',
	['new_captcha']: 'number.integer',
	success: 'number.integer',
	'use_v4?': 'boolean',
});
const schemaVerifyTicket = type({ ['risk_ticket']: 'string', ['verify_str']: 'unknown' });
const schemaVerifyStrategy = type({ ticket: 'string', ['verify_type']: 'string' });
const schemaTokenResponse = type({
	retcode: '0',
	message: 'string',
	data: { tokens: type({ ['token_type']: 'number.integer', token: 'string' }).array() },
});

export interface HoyolabCaptcha {
	version: 'v3' | 'v4';
	['session_id']: string;
	gt: string;
	challenge?: string;
	['risk_type']?: string;
	['new_captcha']: number;
	success: number;
}

export interface HoyolabActionTicket {
	['risk_ticket']: string;
	ticket: string;
	['verify_type']: string;
}

export type HoyolabAppLoginResult =
	| { status: 'authenticated'; aid: string; mid: string; stoken: string }
	| { status: 'captcha_required'; captcha: HoyolabCaptcha }
	| { status: 'email_verification_required'; ticket: HoyolabActionTicket };

function _validate<Schema extends Type>(schema: Schema, value: unknown, endpoint: string): Schema['infer'] {
	try {
		return schema.assert(value);
	} catch {
		throw new TeyvatResponseValidationError('POST', endpoint, [
			'authentication response did not match the expected schema',
		]);
	}
}

function _appHeaders(client: TeyvatHttpClient, deviceId: string, deviceName?: string, deviceModel?: string): Headers {
	const headers = new Headers({
		'x-rpc-app_id': APP_ID,
		'x-rpc-client_type': '2',
		'x-rpc-aigis_v4': 'true',
		'x-rpc-app_version': APP_VERSION,
		'x-rpc-sdk_version': SDK_VERSION,
		'x-rpc-language': client.language,
		'x-rpc-device_id': deviceId,
	});
	if (deviceName) headers.set('x-rpc-device_name', deviceName);
	if (deviceModel) headers.set('x-rpc-device_model', deviceModel);
	return headers;
}

function _assertJson(value: string, field: string): unknown {
	try {
		return JSON.parse(value);
	} catch {
		throw new TeyvatResponseValidationError('POST', field, [`${field} must contain valid JSON`]);
	}
}

function _captchaFromHeader(header: string | null): HoyolabCaptcha {
	if (!header) throw new TeyvatResponseValidationError('POST', 'appLoginByPassword', ['missing x-rpc-aigis header']);
	const aigis = _validate(schemaAigis, _assertJson(header, 'x-rpc-aigis'), 'appLoginByPassword');
	const data = typeof aigis.data === 'string' ? _assertJson(aigis.data, 'x-rpc-aigis.data') : aigis.data;

	if (typeof data === 'object' && data !== null && 'use_v4' in data && data.use_v4 === true) {
		const captcha = _validate(schemaCaptchaV4, data, 'appLoginByPassword');
		return {
			version: 'v4',
			['session_id']: aigis.session_id,
			gt: captcha.gt,
			['risk_type']: captcha.risk_type,
			['new_captcha']: captcha.new_captcha,
			success: captcha.success,
		};
	}

	const captcha = _validate(schemaCaptchaV3, data, 'appLoginByPassword');
	return { version: 'v3', ['session_id']: aigis.session_id, ...captcha };
}

function _ticketFromHeader(header: string | null): HoyolabActionTicket {
	if (!header) throw new TeyvatResponseValidationError('POST', 'appLoginByPassword', ['missing x-rpc-verify header']);
	const raw = _validate(schemaVerifyTicket, _assertJson(header, 'x-rpc-verify'), 'appLoginByPassword');
	const strategy = _validate(
		schemaVerifyStrategy,
		typeof raw.verify_str === 'string' ? _assertJson(raw.verify_str, 'x-rpc-verify.verify_str') : raw.verify_str,
		'appLoginByPassword',
	);
	return { ['risk_ticket']: raw.risk_ticket, ticket: strategy.ticket, ['verify_type']: strategy.verify_type };
}

function _aigisHeader(sessionId: string, solution: TeyvatAuthCaptchaSolution): string {
	const { version: _, ...data } = solution;
	return `${sessionId};${Buffer.from(JSON.stringify(data)).toString('base64')}`;
}

function _verifyHeader(ticket: HoyolabActionTicket): string {
	return JSON.stringify({
		['risk_ticket']: ticket.risk_ticket,
		['verify_str']: JSON.stringify({ ticket: ticket.ticket, ['verify_type']: ticket.verify_type }),
	});
}

export async function _hoyolabAppLogin(
	client: TeyvatHttpClient,
	options: {
		account: string;
		password: string;
		deviceId: string;
		deviceName?: string;
		deviceModel?: string;
		captcha?: { ['session_id']: string; solution: TeyvatAuthCaptchaSolution };
		ticket?: HoyolabActionTicket;
	},
): Promise<HoyolabAppLoginResult> {
	const body = { account: options.account, password: options.password };
	const headers = _appHeaders(client, options.deviceId, options.deviceName, options.deviceModel);
	headers.set('DS', _generateAppLoginDs(body));
	if (options.captcha) headers.set('x-rpc-aigis', _aigisHeader(options.captcha.session_id, options.captcha.solution));
	if (options.ticket) headers.set('x-rpc-verify', _verifyHeader(options.ticket));

	const response = await client.rawRequest({
		domain: TEYVAT_DOMAINS.hoyoversePassport,
		path: 'ma-passport/api/appLoginByPassword',
		method: 'POST',
		body,
		headers,
		skipAuth: true,
	});
	const envelope = _validate(schemaEnvelope, response.data, '/ma-passport/api/appLoginByPassword');
	if (envelope.retcode === -3101) {
		return { status: 'captcha_required', captcha: _captchaFromHeader(response.headers.get('x-rpc-aigis')) };
	}
	if (envelope.retcode === -3239) {
		return {
			status: 'email_verification_required',
			ticket: _ticketFromHeader(response.headers.get('x-rpc-verify')),
		};
	}
	if (envelope.retcode !== 0) {
		throw new TeyvatApiError(envelope.retcode, envelope.message, 'POST', '/ma-passport/api/appLoginByPassword');
	}
	const success = _validate(schemaLoginSuccess, response.data, '/ma-passport/api/appLoginByPassword');
	return {
		status: 'authenticated',
		aid: success.data.user_info.aid,
		mid: success.data.user_info.mid,
		stoken: success.data.token.token,
	};
}

export async function _hoyolabSendEmailCode(
	client: TeyvatHttpClient,
	ticket: HoyolabActionTicket,
	captcha?: { ['session_id']: string; solution: TeyvatAuthCaptchaSolution },
): Promise<HoyolabCaptcha | undefined> {
	const headers = new Headers({
		'x-rpc-app_id': APP_ID,
		'x-rpc-client_type': '2',
		'x-rpc-language': client.language,
	});
	if (captcha) headers.set('x-rpc-aigis', _aigisHeader(captcha.session_id, captcha.solution));
	const response = await client.rawRequest({
		domain: TEYVAT_DOMAINS.hoyoversePassport,
		path: 'ma-verifier/api/createEmailCaptchaByActionTicket',
		method: 'POST',
		body: { ['action_type']: 'verify_for_component', ['action_ticket']: ticket.ticket },
		headers,
		skipAuth: true,
	});
	const envelope = _validate(schemaEnvelope, response.data, '/ma-verifier/api/createEmailCaptchaByActionTicket');
	if (envelope.retcode === -3101) return _captchaFromHeader(response.headers.get('x-rpc-aigis'));
	if (envelope.retcode !== 0) {
		throw new TeyvatApiError(
			envelope.retcode,
			envelope.message,
			'POST',
			'/ma-verifier/api/createEmailCaptchaByActionTicket',
		);
	}
}

export async function _hoyolabVerifyEmailCode(
	client: TeyvatHttpClient,
	ticket: HoyolabActionTicket,
	code: string,
): Promise<void> {
	const response = await client.rawRequest({
		domain: TEYVAT_DOMAINS.hoyoversePassport,
		path: 'ma-verifier/api/verifyActionTicketPartly',
		method: 'POST',
		body: {
			['action_type']: 'verify_for_component',
			['action_ticket']: ticket.ticket,
			['email_captcha']: code,
			['verify_method']: 2,
		},
		headers: { 'x-rpc-app_id': APP_ID, 'x-rpc-client_type': '2', 'x-rpc-language': client.language },
		skipAuth: true,
	});
	const envelope = _validate(schemaEnvelope, response.data, '/ma-verifier/api/verifyActionTicketPartly');
	if (envelope.retcode !== 0) {
		throw new TeyvatApiError(
			envelope.retcode,
			envelope.message,
			'POST',
			'/ma-verifier/api/verifyActionTicketPartly',
		);
	}
}

export async function _hoyolabCompleteCookies(client: TeyvatHttpClient): Promise<Record<string, string>> {
	const mid = client.cookies.get('ltmid_v2') ?? client.cookies.get('account_mid_v2');
	if (!mid) throw new TypeError('Cannot complete cookies without a HoYoLAB account mid');

	const response = await client.rawRequest({
		domain: TEYVAT_DOMAINS.hoyoversePassport,
		path: 'ma-passport/token/getBySToken',
		method: 'POST',
		body: { ['dst_token_types']: [2, 4] },
		headers: {
			['DS']: _generateAppTokenDs(),
			'x-rpc-app_id': APP_ID,
			['Cookie']: client.cookies.toHeader({ mid }),
		},
		skipAuth: true,
	});
	const envelope = _validate(schemaEnvelope, response.data, '/ma-passport/token/getBySToken');
	if (envelope.retcode !== 0) {
		throw new TeyvatApiError(envelope.retcode, envelope.message, 'POST', '/ma-passport/token/getBySToken');
	}
	const data = _validate(schemaTokenResponse, response.data, '/ma-passport/token/getBySToken').data;
	const cookies: Record<string, string> = {};
	for (const token of data.tokens) {
		if (token.token_type === 2) cookies.ltoken_v2 = token.token;
		if (token.token_type === 4) cookies.cookie_token_v2 = token.token;
	}
	if (!cookies.ltoken_v2 || !cookies.cookie_token_v2) {
		throw new TeyvatResponseValidationError('POST', '/ma-passport/token/getBySToken', [
			'response must contain token types 2 and 4',
		]);
	}
	return cookies;
}
