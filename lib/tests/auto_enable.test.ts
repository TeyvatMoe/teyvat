import { afterEach, describe, expect, test } from 'bun:test';
import { _enableAccountFeature, _requestWithAutoEnable } from '#/client/auto_enable.ts';
import { TeyvatApiError, TeyvatError } from '#/client/errors.ts';
import { Teyvat } from '#/client/teyvat.ts';

const originalFetch = globalThis.fetch;

afterEach(() => {
	globalThis.fetch = originalFetch;
});

function _setFetch(fetch: (input: Request | string | URL, init?: RequestInit) => Promise<Response>): void {
	globalThis.fetch = fetch as typeof globalThis.fetch;
}

function _client(autoEnable = true) {
	const teyvat = new Teyvat({
		cookies: { ['account_id_v2']: '123', ['cookie_token_v2']: 'cookie', ['ltoken_v2']: 'ltoken' },
		autoEnable,
	});
	const account = teyvat.account(612_345_678);
	Object.defineProperty(teyvat, 'accounts', { value: async () => [account] });
	return { teyvat, account };
}

describe('automatic feature enabling', () => {
	test('refuses to change settings for an unbound UID', async () => {
		_setFetch(async () => {
			throw new Error('fetch must not be called');
		});
		const teyvat = new Teyvat({ cookies: { ['account_id_v2']: '123' }, autoEnable: true });
		const account = teyvat.account(612_345_678);
		Object.defineProperty(teyvat, 'accounts', { value: async () => [] });
		await expect(_enableAccountFeature(account, 'battle_chronicle')).rejects.toBeInstanceOf(TeyvatError);
	});

	test('enables prerequisite settings once and deduplicates concurrent work', async () => {
		const switches: number[] = [];
		_setFetch(async (_input, init) => {
			const body = JSON.parse(String(init?.body)) as { ['switch_id']: number };
			switches.push(body.switch_id);
			await Promise.resolve();
			return Response.json({ retcode: 0, message: 'OK', data: null });
		});
		const { account } = _client();
		await Promise.all([
			_enableAccountFeature(account, 'character_details'),
			_enableAccountFeature(account, 'character_details'),
		]);
		await _enableAccountFeature(account, 'character_details');
		expect(switches).toEqual([1, 2]);
	});

	test('retries only recognized failures after enabling', async () => {
		_setFetch(async () => Response.json({ retcode: 0, message: 'OK', data: null }));
		const { account } = _client();
		let attempts = 0;
		const result = await _requestWithAutoEnable(
			account,
			'battle_chronicle',
			async () => {
				if (attempts++ === 0) throw new TeyvatApiError(10102, 'private', 'GET', '/example');
				return 'done';
			},
			(cause): cause is TeyvatApiError => cause instanceof TeyvatApiError && cause.retcode === 10102,
		);
		expect(result).toBe('done');
		expect(attempts).toBe(2);
	});

	test('does not enable when the client policy is disabled', async () => {
		_setFetch(async () => {
			throw new Error('fetch must not be called');
		});
		const { account } = _client(false);
		const error = new TeyvatApiError(10102, 'private', 'GET', '/example');
		await expect(
			_requestWithAutoEnable(
				account,
				'battle_chronicle',
				async () => {
					throw error;
				},
				(cause): cause is TeyvatApiError => cause instanceof TeyvatApiError && cause.retcode === 10102,
			),
		).rejects.toBe(error);
	});
});
