import { afterEach, describe, expect, test } from 'bun:test';
import { TeyvatApiError, TeyvatRateLimitError, TeyvatResponseValidationError } from '#/client/errors.ts';
import { Teyvat } from '#/client/teyvat.ts';

const originalFetch = globalThis.fetch;
const originalNow = Date.now;
const UID = 612_345_678;
const CHARACTER_ID = 10_000_001;

afterEach(() => {
	globalThis.fetch = originalFetch;
	Date.now = originalNow;
});

function _setFetch(fetch: (input: Request | string | URL, init?: RequestInit) => Promise<Response>): void {
	globalThis.fetch = fetch as typeof globalThis.fetch;
}

function _calculatorCharacter(id = CHARACTER_ID, ascension: unknown = 5) {
	return {
		id,
		name: 'Example Character',
		icon: 'character-icon',
		['avatar_level']: 5,
		['element_attr_id']: 1,
		['weapon_cat_id']: 1,
		['level_current']: 80,
		['max_level']: 90,
		['promote_level']: ascension,
	};
}

function _calculatorResponse(list: unknown[]): Response {
	return Response.json({ retcode: 0, message: 'OK', data: { list } });
}

function _detailResponse(id = CHARACTER_ID): Response {
	const baseWeapon = {
		id: 11_101,
		icon: 'weapon-icon',
		type: 1,
		rarity: 5,
		level: 90,
		['affix_level']: 1,
		name: 'Example Weapon',
	};
	return Response.json({
		retcode: 0,
		message: 'OK',
		data: {
			list: [
				{
					base: {
						id,
						icon: 'character-icon',
						name: 'Example Character',
						element: 'Pyro',
						fetter: 10,
						level: 80,
						rarity: 5,
						['actived_constellation_num']: 2,
						image: 'display-image',
						['is_chosen']: true,
						['side_icon']: 'side-icon',
						['weapon_type']: 1,
						weapon: baseWeapon,
					},
					weapon: {
						...baseWeapon,
						['promote_level']: 6,
						['type_name']: 'Sword',
						desc: 'Description',
						['main_property']: { ['property_type']: 1, base: '100', add: '0', final: '100' },
						['sub_property']: null,
					},
					relics: [],
					constellations: [],
					costumes: [],
					['selected_properties']: [],
					['base_properties']: [],
					['extra_properties']: [],
					['element_properties']: [],
					skills: [],
					['recommend_relic_property']: null,
					['weapon_skin']: null,
					['unlock_tps']: false,
				},
			],
			['property_map']: {
				'1': { ['property_type']: 1, name: 'Base ATK', icon: null, ['filter_name']: 'Base ATK' },
			},
			['relic_property_options']: {},
			['relic_wiki']: {},
			['weapon_wiki']: {},
			['avatar_wiki']: {},
		},
	});
}

function _account() {
	return new Teyvat({
		cookies: { ['account_id_v2']: '123', ['cookie_token_v2']: 'cookie', ['ltoken_v2']: 'ltoken' },
	}).account(UID);
}

describe('character ascension', () => {
	test('maps calculator ascension into calculator and detailed characters', async () => {
		const paths: string[] = [];
		_setFetch(async (input) => {
			const path = new URL(String(input)).pathname;
			paths.push(path);
			return path.endsWith('/sync/avatar/list')
				? _calculatorResponse([_calculatorCharacter()])
				: _detailResponse();
		});
		const account = _account();
		expect((await account.calculator.characters())[0]?.ascension).toBe(5);
		const [character] = await account.characters();
		expect(character?.ascension).toBe(5);
		expect(character?.weapon.ascension).toBe(6);
		expect(paths.filter((path) => path.endsWith('/character/list'))).toEqual([]);
	});

	test('preserves explicit IDs and detailed response ordering', async () => {
		let detailBody: { ['character_ids']?: number[] } = {};
		_setFetch(async (input, init) => {
			const path = new URL(String(input)).pathname;
			if (path.endsWith('/sync/avatar/list')) return _calculatorResponse([_calculatorCharacter()]);
			detailBody = JSON.parse(String(init?.body));
			return _detailResponse();
		});
		const characters = await _account().characters({ ids: [CHARACTER_ID, CHARACTER_ID] });
		expect(detailBody.character_ids).toEqual([CHARACTER_ID]);
		expect(characters.map((character) => character.id)).toEqual([CHARACTER_ID]);
	});

	test('returns immediately for explicit empty IDs and avoids detail requests for empty accounts', async () => {
		let calls = 0;
		_setFetch(async () => {
			calls++;
			return _calculatorResponse([]);
		});
		const account = _account();
		expect(await account.characters({ ids: [] })).toEqual([]);
		expect(calls).toBe(0);
		expect(await account.characters()).toEqual([]);
		expect(calls).toBe(1);
	});

	test('rejects malformed or missing calculator ascension data', async () => {
		_setFetch(async () => _calculatorResponse([_calculatorCharacter(CHARACTER_ID, -1)]));
		await expect(_account().calculator.characters()).rejects.toBeInstanceOf(TeyvatResponseValidationError);

		_setFetch(async (input) => {
			const path = new URL(String(input)).pathname;
			return path.endsWith('/sync/avatar/list')
				? _calculatorResponse([_calculatorCharacter(CHARACTER_ID + 1)])
				: _detailResponse();
		});
		await expect(_account().characters({ ids: [CHARACTER_ID] })).rejects.toThrow(
			`Missing calculator ascension data for character ${CHARACTER_ID}`,
		);
	});

	test('propagates calculator synchronization failures when autoEnable is disabled', async () => {
		let calls = 0;
		_setFetch(async () => {
			calls++;
			return Response.json({ retcode: -502002, message: 'sync disabled', data: null });
		});
		try {
			await _account().characters();
			throw new Error('characters unexpectedly succeeded');
		} catch (cause) {
			expect(cause).toBeInstanceOf(TeyvatApiError);
			expect((cause as TeyvatApiError).retcode).toBe(-502002);
		}
		expect(calls).toBe(1);
	});
});

describe('calculator character synchronization cache', () => {
	test('shares validated results across calculator and detailed character calls', async () => {
		let calculatorCalls = 0;
		_setFetch(async (input) => {
			const path = new URL(String(input)).pathname;
			if (path.endsWith('/sync/avatar/list')) {
				calculatorCalls++;
				return _calculatorResponse([_calculatorCharacter()]);
			}
			return _detailResponse();
		});
		const account = _account();
		const calculatorCharacters = await account.calculator.characters();
		const calculatorCharacter = calculatorCharacters[0];
		if (!calculatorCharacter) throw new Error('expected a calculator character');
		calculatorCharacter.name = 'mutated';

		expect((await account.calculator.characters())[0]?.name).toBe('Example Character');
		expect((await account.characters())[0]?.ascension).toBe(5);
		expect(calculatorCalls).toBe(1);
		await account.characters({ update: true });
		expect(calculatorCalls).toBe(2);
	});

	test('deduplicates concurrent refreshes and supports forced updates', async () => {
		let calculatorCalls = 0;
		let resolveFirst: (() => void) | undefined;
		const firstRequest = new Promise<void>((resolve) => {
			resolveFirst = resolve;
		});
		_setFetch(async () => {
			calculatorCalls++;
			if (calculatorCalls === 1) await firstRequest;
			return _calculatorResponse([_calculatorCharacter()]);
		});
		const calculator = _account().calculator;
		const first = calculator.characters();
		const second = calculator.characters({ update: true });
		await new Promise((resolve) => setTimeout(resolve, 0));
		expect(calculatorCalls).toBe(1);
		resolveFirst?.();
		await Promise.all([first, second]);

		await calculator.characters({ update: true });
		expect(calculatorCalls).toBe(2);
	});

	test('returns stale data while refreshing and preserves it after failures', async () => {
		let now = 1_000;
		Date.now = () => now;
		let calculatorCalls = 0;
		let failRefresh = false;
		_setFetch(async () => {
			calculatorCalls++;
			if (failRefresh) return Response.json({ retcode: -1, message: 'temporary failure', data: null });
			return _calculatorResponse([_calculatorCharacter(CHARACTER_ID, calculatorCalls === 1 ? 5 : 6)]);
		});
		const calculator = _account().calculator;
		expect((await calculator.characters())[0]?.ascension).toBe(5);

		now += 15 * 60 * 1000;
		expect((await calculator.characters())[0]?.ascension).toBe(5);
		await calculator.characters({ update: true });
		expect((await calculator.characters())[0]?.ascension).toBe(6);

		failRefresh = true;
		now += 15 * 60 * 1000;
		expect((await calculator.characters())[0]?.ascension).toBe(6);
		await expect(calculator.characters({ update: true })).rejects.toBeInstanceOf(TeyvatApiError);
		now -= 15 * 60 * 1000;
		expect((await calculator.characters())[0]?.ascension).toBe(6);
		expect(calculatorCalls).toBe(3);
	});

	test('opens a local cooldown for calculator rate limits', async () => {
		let now = 10_000;
		Date.now = () => now;
		let calculatorCalls = 0;
		_setFetch(async () => {
			calculatorCalls++;
			return calculatorCalls === 1
				? Response.json({ retcode: -500004, message: 'Too many attempts', data: null })
				: _calculatorResponse([_calculatorCharacter()]);
		});
		const calculator = _account().calculator;
		let retryAt = 0;
		try {
			await calculator.characters();
			throw new Error('rate-limited request unexpectedly succeeded');
		} catch (cause) {
			expect(cause).toBeInstanceOf(TeyvatRateLimitError);
			retryAt = (cause as TeyvatRateLimitError).retryAt.getTime();
			expect(retryAt).toBe(now + 60_000);
		}

		await expect(calculator.characters()).rejects.toMatchObject({ retryAt: new Date(retryAt) });
		await expect(calculator.characters({ update: true })).rejects.toBeInstanceOf(TeyvatRateLimitError);
		expect(calculatorCalls).toBe(1);

		now = retryAt;
		expect((await calculator.characters())[0]?.id).toBe(CHARACTER_ID);
		expect(calculatorCalls).toBe(2);
	});

	test('serves stale data without retrying during a rate-limit cooldown', async () => {
		let now = 1_000;
		Date.now = () => now;
		let calculatorCalls = 0;
		_setFetch(async () => {
			calculatorCalls++;
			return calculatorCalls === 1
				? _calculatorResponse([_calculatorCharacter()])
				: Response.json({ retcode: -500004, message: 'Too many attempts', data: null });
		});
		const calculator = _account().calculator;
		await calculator.characters();
		now += 15 * 60 * 1000;

		expect((await calculator.characters())[0]?.id).toBe(CHARACTER_ID);
		await expect(calculator.characters({ update: true })).rejects.toBeInstanceOf(TeyvatRateLimitError);
		expect((await calculator.characters())[0]?.id).toBe(CHARACTER_ID);
		expect(calculatorCalls).toBe(2);
	});
});
