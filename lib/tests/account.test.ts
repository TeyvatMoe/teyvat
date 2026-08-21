import { afterEach, describe, expect, test } from 'bun:test';
import { TeyvatApiError, TeyvatError } from '#/client/errors.ts';
import { Teyvat } from '#/client/teyvat.ts';

const originalFetch = globalThis.fetch;
const UID = 612_345_678;

afterEach(() => {
	globalThis.fetch = originalFetch;
});

function _setFetch(fetch: (input: Request | string | URL, init?: RequestInit) => Promise<Response>): void {
	globalThis.fetch = fetch as typeof globalThis.fetch;
}

function _roles(nickname: string, list = true): Response {
	return Response.json({
		retcode: 0,
		message: 'OK',
		data: {
			list: list
				? [
						{
							['game_biz']: 'hk4e_global',
							['game_uid']: String(UID),
							nickname,
							region: 'os_usa',
							['region_name']: 'America',
							level: 60,
							['is_chosen']: true,
							['is_official']: true,
						},
					]
				: [],
		},
	});
}

function _teyvat(options: ConstructorParameters<typeof Teyvat>[0] = { cookies: { ['account_id_v2']: '123' } }) {
	return new Teyvat(options);
}

describe('account behavior', () => {
	test('caches account arrays while preserving identity across forced refreshes', async () => {
		let calls = 0;
		_setFetch(async () => _roles(calls++ === 0 ? 'First' : 'Updated'));
		const teyvat = _teyvat();
		const first = await teyvat.accounts();
		first.length = 0;
		const cached = await teyvat.accounts();
		expect(calls).toBe(1);
		expect(cached).toHaveLength(1);
		expect(cached[0]?.nickname).toBe('First');
		const refreshed = await teyvat.accounts({ update: true });
		expect(calls).toBe(2);
		expect(refreshed[0]).toBe(cached[0]);
		expect(refreshed[0]?.nickname).toBe('Updated');
	});

	test('uses a forced-fresh ownership check before showcase mutations', async () => {
		let roleCalls = 0;
		let mutationCalls = 0;
		_setFetch(async (input) => {
			const path = new URL(String(input)).pathname;
			if (path.endsWith('/getUserGameRolesByCookie')) return _roles('Bound', roleCalls++ === 0);
			if (path.endsWith('/character/top')) mutationCalls++;
			throw new Error(`Unexpected request to ${path}`);
		});
		const teyvat = _teyvat();
		const [account] = await teyvat.accounts();
		if (!account) throw new Error('Expected a bound account');
		await expect(account.setShowcase([1])).rejects.toThrow('not bound');
		expect(roleCalls).toBe(2);
		expect(mutationCalls).toBe(0);
	});

	test('validates showcase limits before making a request', async () => {
		let calls = 0;
		_setFetch(async () => {
			calls++;
			return _roles('Unused');
		});
		const account = _teyvat().account(UID);
		await expect(account.setShowcase(Array.from({ length: 13 }, (_, index) => index + 1))).rejects.toThrow(
			'cannot contain more than 12',
		);
		expect(calls).toBe(0);
	});

	test('maps check-in information and history without account identity', async () => {
		_setFetch(async (input) => {
			const path = new URL(String(input)).pathname;
			if (path.endsWith('/info'))
				return Response.json({ retcode: 0, message: 'OK', data: { ['is_sign']: true, ['total_sign_day']: 1 } });
			if (path.endsWith('/home'))
				return Response.json({
					retcode: 0,
					message: 'OK',
					data: { awards: [{ name: 'Primogem', cnt: 20, icon: 'icon' }] },
				});
			if (path.endsWith('/award'))
				return Response.json({
					retcode: 0,
					message: 'OK',
					data: {
						list: [
							{ id: 1, name: 'Primogem', cnt: 20, img: 'icon', ['created_at']: '2026-01-02 03:04:05' },
						],
					},
				});
			throw new Error(`Unexpected request to ${path}`);
		});
		const teyvat = _teyvat();
		const info = await teyvat.checkIn.info();
		expect(info).toMatchObject({ signedIn: true, claimedDays: 1, rewards: [{ name: 'Primogem', amount: 20 }] });
		expect(info).not.toHaveProperty('uid');
		const entries = await teyvat.checkIn.history().all();
		expect(entries[0]).toMatchObject({ id: 1, name: 'Primogem', amount: 20 });
		expect(entries[0]).not.toHaveProperty('uid');
	});

	test('keeps redemption codes out of API errors', async () => {
		const code = 'SECRET-CODE';
		_setFetch(async () => Response.json({ retcode: -9999, message: `invalid ${code}`, data: null }));
		try {
			await _teyvat().account(UID).redeemCode(`  ${code}  `);
			throw new Error('redemption unexpectedly succeeded');
		} catch (cause) {
			expect(cause).toBeInstanceOf(TeyvatApiError);
			expect(String(cause)).not.toContain(code);
			expect((cause as TeyvatApiError).upstreamMessage).not.toContain(code);
		}
		await expect(_teyvat().account(UID).redeemCode('   ')).rejects.toBeInstanceOf(TeyvatError);
	});
});
