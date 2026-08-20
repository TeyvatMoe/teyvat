import { type Type, type } from 'arktype';
import { _generate_app_login_ds, _generate_app_token_ds } from '../../auth/ds.ts';
import { TeyvatApiError, TeyvatResponseValidationError } from '../../client/errors.ts';
import type { TeyvatHttpClient } from '../../client/request.ts';
import { TEYVAT_DOMAINS } from '../../consts/domains.ts';
import type { TeyvatAuthCaptchaSolution } from '../../types/auth.ts';

const APP_ID = 'c9oqaq3s3gu8';
const APP_VERSION = '4.8.0';
const SDK_VERSION = '2.2.0';

const schema_envelope = type({ retcode: 'number.integer', message: 'string', data: 'unknown' });
const schema_login_success = type({
	retcode: '0',
	message: 'string',
	data: {
		token: { token: 'string' },
		user_info: { aid: 'string', mid: 'string' },
	},
});
const schema_aigis = type({ session_id: 'string', data: 'unknown' });
const schema_captcha_v3 = type({
	gt: 'string',
	challenge: 'string',
	new_captcha: 'number.integer',
	success: 'number.integer',
});
const schema_captcha_v4 = type({
	gt: 'string',
	risk_type: 'string',
	new_captcha: 'number.integer',
	success: 'number.integer',
	'use_v4?': 'boolean',
});
const schema_verify_ticket = type({ risk_ticket: 'string', verify_str: 'unknown' });
const schema_verify_strategy = type({ ticket: 'string', verify_type: 'string' });
const schema_token_response = type({
	retcode: '0',
	message: 'string',
	data: { tokens: [{ token_type: 'number.integer', token: 'string' }, '[]'] },
});

export interface HoyolabCaptcha {
	version: 'v3' | 'v4';
	session_id: string;
	gt: string;
	challenge?: string;
	risk_type?: string;
	new_captcha: number;
	success: number;
}

export interface HoyolabActionTicket {
	risk_ticket: string;
	ticket: string;
	verify_type: string;
}

export type HoyolabAppLoginResult =
	| { status: 'authenticated'; aid: string; mid: string; stoken: string }
	| { status: 'captcha_required'; captcha: HoyolabCaptcha }
	| { status: 'email_verification_required'; ticket: HoyolabActionTicket };

function _validate<schema extends Type>(schema: schema, value: unknown, endpoint: string): schema['infer'] {
	try {
		return schema.assert(value);
	} catch {
		throw new TeyvatResponseValidationError('POST', endpoint, [
			'authentication response did not match the expected schema',
		]);
	}
}

function _app_headers(device_id: string, device_name?: string, device_model?: string): Headers {
	const headers = new Headers({
		'x-rpc-app_id': APP_ID,
		'x-rpc-client_type': '2',
		'x-rpc-aigis_v4': 'true',
		'x-rpc-app_version': APP_VERSION,
		'x-rpc-sdk_version': SDK_VERSION,
		'x-rpc-language': 'en-us',
		'x-rpc-device_id': device_id,
	});
	if (device_name) headers.set('x-rpc-device_name', device_name);
	if (device_model) headers.set('x-rpc-device_model', device_model);
	return headers;
}

function _assert_json(value: string, field: string): unknown {
	try {
		return JSON.parse(value);
	} catch {
		throw new TeyvatResponseValidationError('POST', field, [`${field} must contain valid JSON`]);
	}
}

function _captcha_from_header(header: string | null): HoyolabCaptcha {
	if (!header) throw new TeyvatResponseValidationError('POST', 'appLoginByPassword', ['missing x-rpc-aigis header']);
	const aigis = _validate(schema_aigis, _assert_json(header, 'x-rpc-aigis'), 'appLoginByPassword');
	const data = typeof aigis.data === 'string' ? _assert_json(aigis.data, 'x-rpc-aigis.data') : aigis.data;

	if (typeof data === 'object' && data !== null && 'use_v4' in data && data.use_v4 === true) {
		const captcha = _validate(schema_captcha_v4, data, 'appLoginByPassword');
		return {
			version: 'v4',
			session_id: aigis.session_id,
			gt: captcha.gt,
			risk_type: captcha.risk_type,
			new_captcha: captcha.new_captcha,
			success: captcha.success,
		};
	}

	const captcha = _validate(schema_captcha_v3, data, 'appLoginByPassword');
	return { version: 'v3', session_id: aigis.session_id, ...captcha };
}

function _ticket_from_header(header: string | null): HoyolabActionTicket {
	if (!header) throw new TeyvatResponseValidationError('POST', 'appLoginByPassword', ['missing x-rpc-verify header']);
	const raw = _validate(schema_verify_ticket, _assert_json(header, 'x-rpc-verify'), 'appLoginByPassword');
	const strategy = _validate(
		schema_verify_strategy,
		typeof raw.verify_str === 'string' ? _assert_json(raw.verify_str, 'x-rpc-verify.verify_str') : raw.verify_str,
		'appLoginByPassword',
	);
	return { risk_ticket: raw.risk_ticket, ticket: strategy.ticket, verify_type: strategy.verify_type };
}

function _aigis_header(session_id: string, solution: TeyvatAuthCaptchaSolution): string {
	const { version: _, ...data } = solution;
	return `${session_id};${Buffer.from(JSON.stringify(data)).toString('base64')}`;
}

function _verify_header(ticket: HoyolabActionTicket): string {
	return JSON.stringify({
		risk_ticket: ticket.risk_ticket,
		verify_str: JSON.stringify({ ticket: ticket.ticket, verify_type: ticket.verify_type }),
	});
}

export async function _hoyolab_app_login(
	client: TeyvatHttpClient,
	options: {
		account: string;
		password: string;
		device_id: string;
		device_name?: string;
		device_model?: string;
		captcha?: { session_id: string; solution: TeyvatAuthCaptchaSolution };
		ticket?: HoyolabActionTicket;
	},
): Promise<HoyolabAppLoginResult> {
	const body = { account: options.account, password: options.password };
	const headers = _app_headers(options.device_id, options.device_name, options.device_model);
	headers.set('DS', _generate_app_login_ds(body));
	if (options.captcha)
		headers.set('x-rpc-aigis', _aigis_header(options.captcha.session_id, options.captcha.solution));
	if (options.ticket) headers.set('x-rpc-verify', _verify_header(options.ticket));

	const response = await client.raw_request({
		domain: TEYVAT_DOMAINS.hoyoverse_passport,
		path: 'ma-passport/api/appLoginByPassword',
		method: 'POST',
		body,
		headers,
		skip_auth: true,
	});
	const envelope = _validate(schema_envelope, response.data, '/ma-passport/api/appLoginByPassword');
	if (envelope.retcode === -3101) {
		return { status: 'captcha_required', captcha: _captcha_from_header(response.headers.get('x-rpc-aigis')) };
	}
	if (envelope.retcode === -3239) {
		return {
			status: 'email_verification_required',
			ticket: _ticket_from_header(response.headers.get('x-rpc-verify')),
		};
	}
	if (envelope.retcode !== 0) {
		throw new TeyvatApiError(envelope.retcode, envelope.message, 'POST', '/ma-passport/api/appLoginByPassword');
	}
	const success = _validate(schema_login_success, response.data, '/ma-passport/api/appLoginByPassword');
	return {
		status: 'authenticated',
		aid: success.data.user_info.aid,
		mid: success.data.user_info.mid,
		stoken: success.data.token.token,
	};
}

export async function _hoyolab_send_email_code(
	client: TeyvatHttpClient,
	ticket: HoyolabActionTicket,
	captcha?: { session_id: string; solution: TeyvatAuthCaptchaSolution },
): Promise<HoyolabCaptcha | undefined> {
	const headers = new Headers({ 'x-rpc-app_id': APP_ID, 'x-rpc-client_type': '2', 'x-rpc-language': 'en-us' });
	if (captcha) headers.set('x-rpc-aigis', _aigis_header(captcha.session_id, captcha.solution));
	const response = await client.raw_request({
		domain: TEYVAT_DOMAINS.hoyoverse_passport,
		path: 'ma-verifier/api/createEmailCaptchaByActionTicket',
		method: 'POST',
		body: { action_type: 'verify_for_component', action_ticket: ticket.ticket },
		headers,
		skip_auth: true,
	});
	const envelope = _validate(schema_envelope, response.data, '/ma-verifier/api/createEmailCaptchaByActionTicket');
	if (envelope.retcode === -3101) return _captcha_from_header(response.headers.get('x-rpc-aigis'));
	if (envelope.retcode !== 0) {
		throw new TeyvatApiError(
			envelope.retcode,
			envelope.message,
			'POST',
			'/ma-verifier/api/createEmailCaptchaByActionTicket',
		);
	}
}

export async function _hoyolab_verify_email_code(
	client: TeyvatHttpClient,
	ticket: HoyolabActionTicket,
	code: string,
): Promise<void> {
	const response = await client.raw_request({
		domain: TEYVAT_DOMAINS.hoyoverse_passport,
		path: 'ma-verifier/api/verifyActionTicketPartly',
		method: 'POST',
		body: {
			action_type: 'verify_for_component',
			action_ticket: ticket.ticket,
			email_captcha: code,
			verify_method: 2,
		},
		headers: { 'x-rpc-app_id': APP_ID, 'x-rpc-client_type': '2', 'x-rpc-language': 'en-us' },
		skip_auth: true,
	});
	const envelope = _validate(schema_envelope, response.data, '/ma-verifier/api/verifyActionTicketPartly');
	if (envelope.retcode !== 0) {
		throw new TeyvatApiError(
			envelope.retcode,
			envelope.message,
			'POST',
			'/ma-verifier/api/verifyActionTicketPartly',
		);
	}
}

export async function _hoyolab_complete_cookies(client: TeyvatHttpClient): Promise<Record<string, string>> {
	const mid = client.cookies.get('ltmid_v2') ?? client.cookies.get('account_mid_v2');
	if (!mid) throw new TypeError('Cannot complete cookies without a HoYoLAB account mid');

	const response = await client.raw_request({
		domain: TEYVAT_DOMAINS.hoyoverse_passport,
		path: 'ma-passport/token/getBySToken',
		method: 'POST',
		body: { dst_token_types: [2, 4] },
		headers: {
			DS: _generate_app_token_ds(),
			'x-rpc-app_id': APP_ID,
			Cookie: client.cookies.to_header({ mid }),
		},
		skip_auth: true,
	});
	const envelope = _validate(schema_envelope, response.data, '/ma-passport/token/getBySToken');
	if (envelope.retcode !== 0) {
		throw new TeyvatApiError(envelope.retcode, envelope.message, 'POST', '/ma-passport/token/getBySToken');
	}
	const data = _validate(schema_token_response, response.data, '/ma-passport/token/getBySToken').data;
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
