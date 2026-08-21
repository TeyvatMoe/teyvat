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
		_setFetch(async () => responses.shift() ?? _success());
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
		await expect(auth.login()).rejects.toThrow('already finished');
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
