import { describe, expect, test } from 'bun:test';
import { type } from 'arktype';
import { TeyvatApiError, TeyvatRequestError, TeyvatResponseValidationError } from '#/client/errors.ts';
import { TeyvatHttpClient } from '#/client/request.ts';
import { TEYVAT_DOMAINS } from '#/consts/domains.ts';

const schema = type({ retcode: '0', message: 'string', data: { value: 'string' } });

function _json(value: unknown, init?: ResponseInit): Response {
	return new Response(JSON.stringify(value), { status: 200, ...init });
}

describe('HTTP client', () => {
	test('joins URLs, encodes query values, merges headers, cookies, and JSON bodies', async () => {
		let request: Request | undefined;
		const client = new TeyvatHttpClient(
			{ token: 'secret' },
			{
				fetch: async (input, init) => {
					request = new Request(String(input), init);
					return _json({ retcode: 0, message: 'OK', data: { value: 'done' } });
				},
			},
		);
		const result = await client.request({
			domain: TEYVAT_DOMAINS.hoyolabTakumi,
			path: '/example',
			method: 'POST',
			params: { text: 'a b', count: 2, enabled: false, omitted: undefined },
			body: { hello: 'world' },
			headers: { 'X-Test': 'yes' },
			schema,
		});
		expect(result).toEqual({ value: 'done' });
		expect(request?.url).toBe('https://api-os-takumi.mihoyo.com/example?text=a+b&count=2&enabled=false');
		expect(request?.method).toBe('POST');
		expect(request?.headers.get('Cookie')).toBe('token=secret');
		expect(request?.headers.get('Content-Type')).toBe('application/json');
		expect(request?.headers.get('X-Test')).toBe('yes');
		expect(await request?.json()).toEqual({ hello: 'world' });
	});

	test('can isolate requests from cookies', async () => {
		let cookie: string | null = 'unset';
		const client = new TeyvatHttpClient(
			{ token: 'secret' },
			{
				fetch: async (input, init) => {
					cookie = new Request(String(input), init).headers.get('Cookie');
					return _json({ retcode: 0, message: 'OK', data: { value: 'done' } });
				},
			},
		);
		await client.request({
			domain: TEYVAT_DOMAINS.hoyolabTakumi,
			path: 'example',
			useCookies: false,
			skipAuth: true,
			schema,
		});
		expect(cookie).toBeNull();
	});

	test('persists returned cookie changes', async () => {
		const updates: Record<string, string>[] = [];
		const client = new TeyvatHttpClient(
			{ token: 'old' },
			{
				fetch: async () =>
					_json(
						{ retcode: 0, message: 'OK', data: { value: 'done' } },
						{
							headers: { 'Set-Cookie': 'token=new; Path=/' },
						},
					),
				onCookiesUpdate: async (cookies) => {
					updates.push(cookies);
				},
			},
		);
		await client.request({ domain: TEYVAT_DOMAINS.hoyolabTakumi, path: 'example', schema });
		expect(client.cookies.get('token')).toBe('new');
		expect(updates).toEqual([{ token: 'new' }]);
	});

	test('retries failed cookie persistence before the next request', async () => {
		let persistenceAttempts = 0;
		let requests = 0;
		const client = new TeyvatHttpClient(
			{ token: 'old' },
			{
				fetch: async () => {
					requests++;
					return _json(
						{ retcode: 0, message: 'OK', data: { value: 'done' } },
						requests === 1 ? { headers: { 'Set-Cookie': 'token=new; Path=/' } } : undefined,
					);
				},
				onCookiesUpdate: async () => {
					if (persistenceAttempts++ === 0) throw new Error('storage unavailable');
				},
			},
		);
		const options = { domain: TEYVAT_DOMAINS.hoyolabTakumi, path: 'example', schema } as const;
		await expect(client.request(options)).rejects.toThrow('Could not persist updated cookies');
		expect(await client.request(options)).toEqual({ value: 'done' });
		expect({ persistenceAttempts, requests }).toEqual({ persistenceAttempts: 2, requests: 2 });
	});

	test('raises API errors before schema validation', async () => {
		const client = new TeyvatHttpClient(
			{},
			{
				fetch: async () => _json({ retcode: 123, message: 'failed', data: null }),
			},
		);
		await expect(
			client.request({ domain: TEYVAT_DOMAINS.hoyolabTakumi, path: 'example', schema }),
		).rejects.toBeInstanceOf(TeyvatApiError);
	});

	test('wraps invalid JSON, HTTP, network, timeout, body, and schema failures', async () => {
		const options = { domain: TEYVAT_DOMAINS.hoyolabTakumi, path: 'example', schema } as const;
		await expect(
			new TeyvatHttpClient({}, { fetch: async () => new Response('bad') }).request(options),
		).rejects.toMatchObject({ kind: 'json' });
		await expect(
			new TeyvatHttpClient({}, { fetch: async () => _json({}, { status: 500 }) }).request(options),
		).rejects.toMatchObject({ kind: 'http' });
		await expect(
			new TeyvatHttpClient(
				{},
				{
					fetch: async () => {
						throw new Error('offline');
					},
				},
			).request(options),
		).rejects.toMatchObject({ kind: 'network' });
		const timeoutClient = new TeyvatHttpClient(
			{},
			{
				timeoutMs: 5,
				fetch: async (_input, init) =>
					await new Promise((_resolve, reject) =>
						init?.signal?.addEventListener('abort', () => reject(init.signal?.reason)),
					),
			},
		);
		await expect(timeoutClient.request(options)).rejects.toMatchObject({ kind: 'timeout' });
		const bodyClient = new TeyvatHttpClient({}, { fetch: async () => _json({}) });
		const circular: { self?: unknown } = {};
		circular.self = circular;
		await expect(bodyClient.request({ ...options, method: 'POST', body: circular })).rejects.toMatchObject({
			kind: 'body',
		});
		const validationClient = new TeyvatHttpClient(
			{},
			{
				fetch: async () => _json({ retcode: 0, message: 'OK', data: { value: 1 } }),
			},
		);
		await expect(validationClient.request(options)).rejects.toBeInstanceOf(TeyvatResponseValidationError);
	});

	test('repairs and replays one safe request but never replays a mutation', async () => {
		const options = { domain: TEYVAT_DOMAINS.hoyolabTakumi, path: 'example', schema } as const;
		let repairs = 0;
		let calls = 0;
		const client = new TeyvatHttpClient(
			{ token: 'old' },
			{
				fetch: async () =>
					_json(
						calls++ === 0
							? { retcode: 10001, message: 'expired', data: null }
							: { retcode: 0, message: 'OK', data: { value: 'done' } },
					),
				repairAuth: async () => {
					repairs++;
					return true;
				},
			},
		);
		expect(await client.request(options)).toEqual({ value: 'done' });
		expect({ calls, repairs }).toEqual({ calls: 2, repairs: 1 });

		calls = 0;
		repairs = 0;
		const mutation = new TeyvatHttpClient(
			{ token: 'old' },
			{
				fetch: async () => _json({ retcode: 10001, message: 'expired', data: null }),
				repairAuth: async () => {
					repairs++;
					return true;
				},
			},
		);
		await expect(mutation.request({ ...options, method: 'POST' })).rejects.toBeInstanceOf(TeyvatApiError);
		expect(repairs).toBe(1);
	});

	test('does not leak query parameters in transport endpoints', async () => {
		const client = new TeyvatHttpClient(
			{},
			{
				fetch: async () => {
					throw new Error('offline');
				},
			},
		);
		try {
			await client.request({
				...{ domain: TEYVAT_DOMAINS.hoyolabTakumi, path: 'example', schema },
				params: { authkey: 'secret' },
			});
		} catch (cause) {
			expect(cause).toBeInstanceOf(TeyvatRequestError);
			expect((cause as TeyvatRequestError).endpoint).toBe('https://api-os-takumi.mihoyo.com/example');
			expect(String(cause)).not.toContain('secret');
		}
	});
});
