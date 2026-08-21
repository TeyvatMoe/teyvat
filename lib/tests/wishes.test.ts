import { afterEach, describe, expect, test } from 'bun:test';
import { TeyvatApiError, TeyvatRequestError } from '#/client/errors.ts';
import { Teyvat } from '#/client/teyvat.ts';

const originalFetch = globalThis.fetch;
const AUTHKEY = 'YWJjZA==';

afterEach(() => {
	globalThis.fetch = originalFetch;
});

function _setFetch(fetch: (input: Request | string | URL, init?: RequestInit) => Promise<Response>): void {
	globalThis.fetch = fetch as typeof globalThis.fetch;
}

describe('authkey client', () => {
	test('validates authkeys locally', () => {
		expect(() => Teyvat.wishes({ authkey: '' })).toThrow('base64');
		expect(() => Teyvat.wishes({ authkey: '%' })).toThrow('percent-encoded');
	});

	test('keeps wish pagination lazy and maps a short page', async () => {
		let calls = 0;
		let request: Request | undefined;
		_setFetch(async (input, init) => {
			calls++;
			request = new Request(String(input), init);
			return Response.json({
				retcode: 0,
				message: 'OK',
				data: {
					page: '1',
					size: '20',
					region: 'os_usa',
					list: [
						{
							uid: '612345678',
							id: '1234567890123456789',
							name: 'Example Character',
							['item_type']: 'Character',
							['rank_type']: '5',
							time: '2026-01-02 03:04:05',
						},
					],
				},
			});
		});
		const wishes = Teyvat.wishes({ authkey: AUTHKEY, language: 'ja-jp' });
		const history = wishes.history({ type: 'character' });
		expect(calls).toBe(0);
		const items = await history.all();
		expect(calls).toBe(1);
		expect(items).toEqual([
			{
				id: '1234567890123456789',
				uid: 612_345_678,
				server: 'os_usa',
				name: 'Example Character',
				itemType: 'character',
				rarity: 5,
				bannerType: 'character',
				wishedAt: new Date('2026-01-02T08:04:05.000Z'),
			},
		]);
		expect(new URL(request?.url ?? '').searchParams.get('lang')).toBe('ja');
		expect(request?.headers.get('Cookie')).toBeNull();
		expect(history.exhausted).toBe(true);
	});

	test('keeps currency and item transaction shapes distinct', async () => {
		const responses = [
			{
				retcode: 0,
				message: 'OK',
				data: { list: [{ id: '10', datetime: '2026-01-02 03:04:05', ['add_num']: '-20', reason: 'Spent' }] },
			},
			{
				retcode: 0,
				message: 'OK',
				data: {
					list: [
						{
							id: '9',
							datetime: '2026-01-02 03:04:05',
							['add_num']: '1',
							reason: 'Obtained',
							name: 'Example Artifact',
							quality: '5',
						},
					],
				},
			},
		];
		_setFetch(async () => Response.json(responses.shift()));
		const wishes = Teyvat.wishes({ authkey: AUTHKEY });
		const [currency] = await wishes.transactions({ type: 'primogem' }).all();
		const [artifact] = await wishes.transactions({ type: 'artifact' }).all();
		expect(currency).toMatchObject({ id: '10', type: 'primogem', amount: -20, reason: 'Spent' });
		expect(currency).not.toHaveProperty('item');
		expect(artifact).toMatchObject({
			id: '9',
			type: 'artifact',
			amount: 1,
			item: { name: 'Example Artifact', rarity: 5 },
		});
	});

	test('limit zero avoids requests and transport failures hide authkeys', async () => {
		let calls = 0;
		_setFetch(async () => {
			calls++;
			throw new Error('offline');
		});
		const wishes = Teyvat.wishes({ authkey: AUTHKEY });
		expect(await wishes.history({ type: 'standard', limit: 0 }).all()).toEqual([]);
		expect(calls).toBe(0);
		try {
			await wishes.history({ type: 'standard' }).next();
			throw new Error('request unexpectedly succeeded');
		} catch (cause) {
			expect(cause).toBeInstanceOf(TeyvatRequestError);
			expect(String(cause)).not.toContain(AUTHKEY);
			expect((cause as TeyvatRequestError).endpoint).not.toContain(AUTHKEY);
		}
	});

	test('sanitizes authkeys echoed by wish and transaction API errors', async () => {
		_setFetch(async () => Response.json({ retcode: -1, message: `invalid ${AUTHKEY}`, data: null }));
		const wishes = Teyvat.wishes({ authkey: AUTHKEY });
		for (const request of [
			wishes.history({ type: 'standard' }).next(),
			wishes.transactions({ type: 'primogem' }).next(),
		]) {
			try {
				await request;
				throw new Error('request unexpectedly succeeded');
			} catch (cause) {
				expect(cause).toBeInstanceOf(TeyvatApiError);
				expect(String(cause)).not.toContain(AUTHKEY);
				expect((cause as TeyvatApiError).upstreamMessage).not.toContain(AUTHKEY);
				expect((cause as Error).cause).toBeUndefined();
			}
		}
	});
});
