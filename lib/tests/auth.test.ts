import { afterEach, describe, expect, test } from 'bun:test';
import { TeyvatError, TeyvatResponseValidationError } from '#/client/errors.ts';
import { Teyvat } from '#/client/teyvat.ts';

const originalFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;
});

function _setFetch(fetch: (input: Request | string | URL, init?: RequestInit) => Promise<Response>): void {
	globalThis.fetch = fetch as typeof globalThis.fetch;
}

function _response(data: unknown, headers?: ConstructorParameters<typeof Headers>[0]): Response {
	return new Response(JSON.stringify(data), { headers: new Headers(headers) });
}

function _success(): Response {
	return _response({
		retcode: 0,
		message: 'OK',
		data: { token: { token: 'stoken' }, ['user_info']: { aid: '123', mid: '456' } },
	});
}

function _aigisData(headers: Headers | undefined): unknown {
	if (!headers) throw new Error('Missing captcha continuation request');
	const header = headers.get('x-rpc-aigis');
	if (!header) throw new Error('Missing x-rpc-aigis header');
	const separator = header.indexOf(';');
	if (separator === -1) throw new Error('Invalid x-rpc-aigis header');
	return JSON.parse(Buffer.from(header.slice(separator + 1), 'base64').toString());
}

describe('authentication session', () => {
	test('continues a captcha-interrupted login and retains state after invalid input', async () => {
		const responses = [
			_response(
				{ retcode: -3101, message: 'captcha', data: null },
				{
					'x-rpc-aigis': JSON.stringify({
						['session_id']: 'session',
						data: { gt: 'gt', challenge: 'challenge', ['new_captcha']: 1, success: 1 },
					}),
				},
			),
			_success(),
		];
		const requestHeaders: Headers[] = [];
		_setFetch(async (_input, init) => {
			requestHeaders.push(new Headers(init?.headers));
			return responses.shift() ?? _success();
		});
		const auth = Teyvat.auth({ account: 'user', password: 'password', deviceId: 'device' });
		const challenge = await auth.login();
		expect(challenge).toMatchObject({ status: 'captcha_required', captcha: { version: 'v3', gt: 'gt' } });
		await expect(auth.completeCaptcha({ version: 'v3' } as never)).rejects.toBeInstanceOf(TeyvatError);
		await expect(
			auth.completeCaptcha({
				version: 'v3',
				geetestChallenge: 'different',
				geetestValidate: 'validate',
				geetestSeccode: 'seccode',
			}),
		).rejects.toThrow('does not match');
		const result = await auth.completeCaptcha({
			version: 'v3',
			geetestChallenge: 'challenge',
			geetestValidate: 'validate',
			geetestSeccode: 'seccode',
		});
		expect(result).toMatchObject({
			status: 'authenticated',
			hoyolabId: '123',
			deviceId: 'device',
			cookies: { stoken: 'stoken', ['ltuid_v2']: '123', ['ltmid_v2']: '456' },
		});
		expect(_aigisData(requestHeaders[1])).toEqual({
			['geetest_challenge']: 'challenge',
			['geetest_validate']: 'validate',
			['geetest_seccode']: 'seccode',
		});
		await expect(auth.login()).rejects.toThrow('already finished');
	});

	test('serializes v4 captcha solutions with HoYoLAB wire keys', async () => {
		const responses = [
			_response(
				{ retcode: -3101, message: 'captcha', data: null },
				{
					'x-rpc-aigis': JSON.stringify({
						['session_id']: 'session',
						data: {
							gt: 'captcha',
							['risk_type']: 'slide',
							['new_captcha']: 1,
							success: 1,
							['use_v4']: true,
						},
					}),
				},
			),
			_success(),
		];
		const requestHeaders: Headers[] = [];
		_setFetch(async (_input, init) => {
			requestHeaders.push(new Headers(init?.headers));
			return responses.shift() ?? _success();
		});
		const auth = Teyvat.auth({ account: 'user', password: 'password', deviceId: 'device' });
		const challenge = await auth.login();
		expect(challenge).toMatchObject({
			status: 'captcha_required',
			captcha: { version: 'v4', captchaId: 'captcha', sessionId: 'session' },
		});
		const result = await auth.completeCaptcha({
			version: 'v4',
			captchaId: 'captcha',
			lotNumber: 'lot',
			passToken: 'pass',
			genTime: 'time',
			captchaOutput: 'output',
		});
		expect(result.status).toBe('authenticated');
		expect(_aigisData(requestHeaders[1])).toEqual({
			['captcha_id']: 'captcha',
			['lot_number']: 'lot',
			['pass_token']: 'pass',
			['gen_time']: 'time',
			['captcha_output']: 'output',
		});
	});

	test('continues email verification through code creation and final login', async () => {
		const verifyHeader = JSON.stringify({
			['risk_ticket']: 'risk',
			['verify_str']: JSON.stringify({ ticket: 'ticket', ['verify_type']: 'email' }),
		});
		const responses = [
			_response({ retcode: -3239, message: 'verify', data: null }, { 'x-rpc-verify': verifyHeader }),
			_response({ retcode: 0, message: 'OK', data: null }),
			_response({ retcode: 0, message: 'OK', data: null }),
			_success(),
		];
		const paths: string[] = [];
		_setFetch(async (input) => {
			paths.push(new URL(String(input)).pathname);
			return responses.shift() ?? _success();
		});
		const auth = Teyvat.auth({ account: 'user', password: 'password' });
		expect(await auth.login()).toEqual({ status: 'email_verification_required' });
		const result = await auth.completeEmail('123456');
		expect(result.status).toBe('authenticated');
		expect(paths).toEqual([
			'/account/ma-passport/api/appLoginByPassword',
			'/account/ma-verifier/api/createEmailCaptchaByActionTicket',
			'/account/ma-verifier/api/verifyActionTicketPartly',
			'/account/ma-passport/api/appLoginByPassword',
		]);
	});

	test('continues email verification when login already sent the code', async () => {
		const verifyHeader = JSON.stringify({
			['risk_ticket']: 'risk',
			['verify_str']: JSON.stringify({ ticket: 'ticket', ['verify_type']: 'email' }),
		});
		const responses = [
			_response(
				{ retcode: -3101, message: 'captcha', data: null },
				{
					'x-rpc-aigis': JSON.stringify({
						['session_id']: 'v4-session',
						data: {
							gt: 'v4-captcha',
							['risk_type']: 'slide',
							['new_captcha']: 1,
							success: 1,
							['use_v4']: true,
						},
					}),
				},
			),
			_response(
				{ retcode: -3101, message: 'captcha', data: null },
				{
					'x-rpc-aigis': JSON.stringify({
						['session_id']: 'v3-session',
						data: { gt: 'v3-gt', challenge: 'v3-challenge', ['new_captcha']: 1, success: 1 },
					}),
				},
			),
			_response({ retcode: -3239, message: 'verify', data: null }, { 'x-rpc-verify': verifyHeader }),
			_response({ retcode: -3206, message: 'Verification code requests too frequent', data: null }),
			_response({ retcode: 0, message: 'OK', data: null }),
			_success(),
		];
		_setFetch(async () => responses.shift() ?? _success());
		const auth = Teyvat.auth({ account: 'user', password: 'password' });
		const v4Challenge = await auth.login();
		expect(v4Challenge).toMatchObject({
			status: 'captcha_required',
			captcha: { version: 'v4', captchaId: 'v4-captcha' },
		});
		const v3Challenge = await auth.completeCaptcha({
			version: 'v4',
			captchaId: 'v4-captcha',
			lotNumber: 'lot',
			passToken: 'pass',
			genTime: 'time',
			captchaOutput: 'output',
		});
		expect(v3Challenge).toMatchObject({
			status: 'captcha_required',
			captcha: { version: 'v3', gt: 'v3-gt', challenge: 'v3-challenge' },
		});
		expect(
			await auth.completeCaptcha({
				version: 'v3',
				geetestChallenge: 'v3-challenge',
				geetestValidate: 'validate',
				geetestSeccode: 'seccode',
			}),
		).toEqual({ status: 'email_verification_required' });
		expect((await auth.completeEmail('123456')).status).toBe('authenticated');
	});

	test('sanitizes malformed authentication responses', async () => {
		_setFetch(async () => _response({ retcode: 0, message: 'OK', data: { password: 'secret' } }));
		const auth = Teyvat.auth({ account: 'user', password: 'secret' });
		try {
			await auth.login();
			throw new Error('login unexpectedly succeeded');
		} catch (cause) {
			expect(cause).toBeInstanceOf(TeyvatResponseValidationError);
			expect(String(cause)).not.toContain('secret');
			expect((cause as Error).cause).toBeUndefined();
		}
	});
});
