import { describe, expect, expectTypeOf, test } from 'bun:test';
import { type } from 'arktype';
import { CookieJar } from '../lib/auth/cookies.ts';
import { TeyvatApiError, TeyvatRequestError, TeyvatResponseValidationError } from '../lib/client/errors.ts';
import { TeyvatHttpClient } from '../lib/client/request.ts';
import { TEYVAT_DOMAINS } from '../lib/consts/domains.ts';

const responseSchema = type({
	retcode: '0',
	message: 'string',
	data: {
		name: 'string',
		count: 'number',
	},
});

function jsonResponse(value: unknown, init: ResponseInit = {}): Response {
	return new Response(JSON.stringify(value), {
		status: 200,
		headers: { 'Content-Type': 'application/json' },
		...init,
	});
}

describe('TeyvatHttpClient', () => {
	test('builds requests and returns validated data', async () => {
		let capturedUrl = '';
		let capturedInit: RequestInit | undefined;
		const client = new TeyvatHttpClient('ltuid_v2=123; token=a=b', {
			fetch: async (input, init) => {
				capturedUrl = String(input);
				capturedInit = init;
				return jsonResponse({ retcode: 0, message: 'OK', data: { name: 'Lumine', count: 2 } });
			},
		});

		const data = await client.request({
			domain: TEYVAT_DOMAINS.genshinRecord,
			path: '/role/basicInfo',
			schema: responseSchema,
			method: 'post',
			params: { role_id: 123, server: 'os_usa', enabled: true, omitted: undefined },
			body: { detail: true },
			headers: { 'X-Test': 'yes' },
		});

		expectTypeOf(data).toEqualTypeOf<{ name: string; count: number }>();
		expect(data).toEqual({ name: 'Lumine', count: 2 });
		expect(capturedUrl).toBe(
			'https://sg-public-api.hoyolab.com/event/game_record/genshin/api/role/basicInfo?role_id=123&server=os_usa&enabled=true',
		);
		expect(capturedInit?.method).toBe('POST');
		const headers = new Headers(capturedInit?.headers);
		expect(headers.get('cookie')).toBe('ltuid_v2=123; token=a=b');
		expect(headers.get('content-type')).toBe('application/json');
		expect(headers.get('x-test')).toBe('yes');
		expect(capturedInit?.body).toBe('{"detail":true}');
	});

	test('merges and deletes response cookies', () => {
		const jar = new CookieJar('keep=yes; remove=yes');
		const headers = new Headers();
		headers.append('Set-Cookie', 'fresh=value; Path=/; HttpOnly');
		headers.append('Set-Cookie', 'remove=gone; Max-Age=0; Path=/');

		jar.updateFromResponse(headers);

		expect(jar.toJSON()).toEqual({ keep: 'yes', fresh: 'value' });
	});

	test('throws API errors before validating success data', async () => {
		const client = new TeyvatHttpClient(
			{},
			{
				fetch: async () => jsonResponse({ retcode: 10102, message: 'Data is not public', data: null }),
			},
		);

		const error = await client
			.request({ domain: TEYVAT_DOMAINS.hoyolabTakumi, path: 'binding/api/test', schema: responseSchema })
			.catch((cause: unknown) => cause);

		expect(error).toBeInstanceOf(TeyvatApiError);
		expect((error as TeyvatApiError).retcode).toBe(10102);
	});

	test('reports schema paths without embedding raw response data', async () => {
		const secret = 'private-value-that-must-not-leak';
		const client = new TeyvatHttpClient(
			{},
			{
				fetch: async () => jsonResponse({ retcode: 0, message: 'OK', data: { name: secret, count: 'two' } }),
			},
		);

		const error = await client
			.request({ domain: TEYVAT_DOMAINS.hoyolabTakumi, path: 'binding/api/test', schema: responseSchema })
			.catch((cause: unknown) => cause);

		expect(error).toBeInstanceOf(TeyvatResponseValidationError);
		expect((error as TeyvatResponseValidationError).message).toContain('data.count');
		expect((error as TeyvatResponseValidationError).message).not.toContain(secret);
	});

	test.each([
		['invalid JSON', async () => new Response('<html>nope</html>'), 'json'],
		['HTTP failure', async () => jsonResponse({ message: 'broken' }, { status: 503 }), 'http'],
		['network failure', async () => Promise.reject(new Error('socket failed')), 'network'],
	] as const)('wraps %s as request errors', async (_name, fetch, kind) => {
		const client = new TeyvatHttpClient({}, { fetch });
		const error = await client
			.request({ domain: TEYVAT_DOMAINS.hoyolabBbs, path: 'test', schema: responseSchema })
			.catch((cause: unknown) => cause);

		expect(error).toBeInstanceOf(TeyvatRequestError);
		expect((error as TeyvatRequestError).kind).toBe(kind);
	});

	test('times out requests without retrying', async () => {
		let calls = 0;
		const client = new TeyvatHttpClient(
			{},
			{
				timeoutMs: 5,
				fetch: async (_input, init) => {
					calls += 1;
					return await new Promise<Response>((_resolve, reject) => {
						init?.signal?.addEventListener('abort', () => reject(init.signal?.reason), { once: true });
					});
				},
			},
		);

		const error = await client
			.request({ domain: TEYVAT_DOMAINS.hoyolabBbs, path: 'test', schema: responseSchema })
			.catch((cause: unknown) => cause);

		expect(error).toBeInstanceOf(TeyvatRequestError);
		expect((error as TeyvatRequestError).kind).toBe('timeout');
		expect(calls).toBe(1);
	});
});
