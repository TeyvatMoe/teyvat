import { afterEach, describe, expect, test } from 'bun:test';
import { TeyvatResponseValidationError } from '#/client/errors.ts';
import { Teyvat } from '#/client/teyvat.ts';

const originalFetch = globalThis.fetch;
const originalNow = Date.now;

afterEach(() => {
	globalThis.fetch = originalFetch;
	Date.now = originalNow;
});

function _profile(overrides: Record<string, unknown> = {}): Response {
	return Response.json({
		retcode: 0,
		message: 'OK',
		data: {
			['user_info']: {
				uid: 123,
				nickname: 'Traveler',
				introduce: 'Ad astra abyssosque',
				avatar: '1',
				gender: 2,
				['avatar_url']: 'avatar.png',
				pendant: 'pendant.png',
				['bg_url']: 'mobile.png',
				['pc_bg_url']: 'desktop.png',
				certification: { type: 2, ['icon_url']: 'badge.png', desc: 'Artist' },
				level: {
					level: 10,
					exp: 250,
					['level_desc']: 'Level 10',
					['bg_color']: '#fff',
					['bg_image']: 'level.png',
				},
				...overrides,
			},
		},
	});
}

function _teyvat(): Teyvat {
	return new Teyvat({ cookies: { ['account_id_v2']: '123' } });
}

describe('HoYoLAB profile', () => {
	test('maps the authenticated profile and returns defensive cache copies', async () => {
		let calls = 0;
		globalThis.fetch = (async (input: Request | string | URL) => {
			calls++;
			const url = new URL(String(input));
			expect(url.pathname).toBe('/community/painter/wapi/user/full');
			expect(url.search).toBe('');
			return _profile();
		}) as unknown as typeof fetch;

		const teyvat = _teyvat();
		const first = await teyvat.info();
		expect(first).toEqual({
			hoyolabId: '123',
			nickname: 'Traveler',
			pfp: 'avatar.png',
			bio: 'Ad astra abyssosque',
			gender: 'female',
			level: { current: 10, experience: 250, description: 'Level 10' },
			pendant: 'pendant.png',
			backgrounds: { mobile: 'mobile.png', desktop: 'desktop.png' },
			certification: { type: 2, description: 'Artist', icon: 'badge.png' },
		});
		first.backgrounds.mobile = 'changed';
		const cached = await teyvat.info();
		expect(cached.backgrounds.mobile).toBe('mobile.png');
		expect(calls).toBe(1);
	});

	test('normalizes optional fields and unknown genders', async () => {
		globalThis.fetch = (async () =>
			_profile({
				gender: 99,
				['bg_url']: undefined,
				['pc_bg_url']: undefined,
				certification: null,
				level: null,
			})) as unknown as typeof fetch;

		const profile = await _teyvat().info();
		expect(profile.gender).toBe('unknown');
		expect(profile.level).toBeNull();
		expect(profile.certification).toBeNull();
		expect(profile.backgrounds).toEqual({ mobile: null, desktop: null });
	});

	test('deduplicates initial and forced refreshes', async () => {
		let calls = 0;
		let resolve: ((response: Response) => void) | undefined;
		globalThis.fetch = (() => {
			calls++;
			return new Promise<Response>((done) => {
				resolve = done;
			});
		}) as unknown as typeof fetch;

		const teyvat = _teyvat();
		const first = teyvat.info();
		const second = teyvat.info({ update: true });
		await Bun.sleep(0);
		expect(calls).toBe(1);
		resolve?.(_profile());
		expect(await first).toEqual(await second);

		const third = teyvat.info({ update: true });
		const fourth = teyvat.info({ update: true });
		await Bun.sleep(0);
		expect(calls).toBe(2);
		resolve?.(_profile({ nickname: 'Updated' }));
		expect((await third).nickname).toBe('Updated');
		expect((await fourth).nickname).toBe('Updated');
	});

	test('returns stale data during a background refresh and preserves it after failure', async () => {
		let now = 1;
		Date.now = () => now;
		let calls = 0;
		let reject: ((cause: Error) => void) | undefined;
		globalThis.fetch = (() => {
			calls++;
			if (calls === 1) return Promise.resolve(_profile());
			return new Promise<Response>((_, fail) => {
				reject = fail;
			});
		}) as unknown as typeof fetch;

		const teyvat = _teyvat();
		expect((await teyvat.info()).nickname).toBe('Traveler');
		now += 3_600_000;
		expect((await teyvat.info()).nickname).toBe('Traveler');
		await Bun.sleep(0);
		expect(calls).toBe(2);
		reject?.(new Error('offline'));
		await Promise.resolve();
		await Promise.resolve();
		expect((await teyvat.info()).nickname).toBe('Traveler');
	});

	test('replaces stale profile data after a successful background refresh', async () => {
		let now = 1;
		Date.now = () => now;
		let calls = 0;
		globalThis.fetch = (async () =>
			_profile(calls++ === 0 ? {} : { nickname: 'Updated' })) as unknown as typeof fetch;

		const teyvat = _teyvat();
		expect((await teyvat.info()).nickname).toBe('Traveler');
		now += 3_600_000;
		expect((await teyvat.info()).nickname).toBe('Traveler');
		await Bun.sleep(0);
		expect((await teyvat.info()).nickname).toBe('Updated');
		expect(calls).toBe(2);
	});

	test('rejects profiles belonging to another HoYoLAB account', async () => {
		globalThis.fetch = (async () => _profile({ uid: 456 })) as unknown as typeof fetch;
		await expect(_teyvat().info()).rejects.toBeInstanceOf(TeyvatResponseValidationError);
	});
});
