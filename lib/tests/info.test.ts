import { afterEach, describe, expect, test } from 'bun:test';
import { TeyvatResponseValidationError } from '#/client/errors.ts';
import { Teyvat } from '#/client/teyvat.ts';

const originalFetch = globalThis.fetch;
const UID = 612_345_678;

afterEach(() => {
	globalThis.fetch = originalFetch;
});

function _infoResponse(worldExplorations: unknown[] = [], worldExplorationDisplay: unknown[] = []): Response {
	return Response.json({
		retcode: 0,
		message: 'OK',
		data: {
			role: {
				['AvatarUrl']: 'avatar.png',
				nickname: 'Traveler',
				region: 'os_usa',
				level: 60,
			},
			stats: {
				['achievement_number']: 1,
				['active_day_number']: 2,
				['avatar_number']: 3,
				['spiral_abyss']: '12-3',
				['anemoculus_number']: 4,
				['geoculus_number']: 5,
				['electroculus_number']: 6,
				['dendroculus_number']: 7,
				['hydroculus_number']: 8,
				['pyroculus_number']: 9,
				['moonoculus_number']: 10,
				['iceculus_number']: 11,
				['common_chest_number']: 12,
				['exquisite_chest_number']: 13,
				['precious_chest_number']: 14,
				['luxurious_chest_number']: 15,
				['magic_chest_number']: 16,
				['way_point_number']: 17,
				['domain_number']: 18,
				['full_fetter_avatar_num']: 19,
				['role_combat']: {
					['is_unlock']: false,
					['max_round_id']: 0,
					['has_data']: false,
					['has_detail_data']: false,
				},
				['hard_challenge']: {
					['is_unlock']: false,
					difficulty: 0,
					name: '',
					['has_data']: false,
				},
			},
			['world_explorations']: worldExplorations,
			['world_exploration_display']: worldExplorationDisplay,
			homes: null,
		},
	});
}

function _exploration(
	id: number,
	name: string,
	explored: number,
	options: {
		parentId?: number;
		type?: string;
		level?: number;
		sevenStatueLevel?: number;
		offerings?: Record<string, unknown>[];
		areas?: Record<string, unknown>[];
		bosses?: Record<string, unknown>[];
	} = {},
) {
	return {
		id,
		['parent_id']: options.parentId ?? 0,
		name,
		['exploration_percentage']: explored,
		type: options.type ?? 'TypeUnknow',
		level: options.level ?? 0,
		icon: `${id}-icon.png`,
		['inner_icon']: `${id}-inner.png`,
		['background_image']: `${id}-background.png`,
		cover: `${id}-cover.png`,
		['map_url']: `https://example.com/maps/${id}`,
		['seven_statue_level']: options.sevenStatueLevel ?? 0,
		offerings: options.offerings ?? [],
		['area_exploration_list']: options.areas ?? [],
		['boss_list']: options.bosses ?? [],
		['natan_reputation']: null,
	};
}

function _display(explorationId: number, groups: Array<{ areaIds: number[]; explored: number }> = []) {
	return {
		['exploration_id']: explorationId,
		group: {
			items: groups.map((group) => ({
				['area_ids']: group.areaIds,
				['exploration_percentage']: group.explored,
			})),
		},
	};
}

describe('account information', () => {
	test('maps every elemental oculi count including distinct Lunar and Cryo values', async () => {
		globalThis.fetch = (async () => _infoResponse()) as unknown as typeof fetch;
		const account = new Teyvat({ cookies: { ['account_id_v2']: '123' } }).account(UID);

		expect((await account.info()).stats.oculi).toEqual({
			anemo: 4,
			geo: 5,
			electro: 6,
			dendro: 7,
			hydro: 8,
			pyro: 9,
			lunar: 10,
			cryo: 11,
		});
	});

	test('maps display-ordered regions with complete special-region hierarchies', async () => {
		const offering = (name: string, openState?: string) => ({
			name,
			level: 1,
			icon: 'offering.png',
			...(openState ? { ['open_state']: openState } : {}),
		});
		const raw = [
			_exploration(99, 'Undisplayed', 1000),
			_exploration(2, 'Liyue', 778, {
				type: 'Reputation',
				level: 4,
				sevenStatueLevel: 9,
				areas: [{ name: 'Galesong Hill', ['exploration_percentage']: 1178 }],
				bosses: [{ name: 'Geo Hypostasis', ['kill_num']: 3 }],
			}),
			_exploration(6, 'The Chasm', 548, {
				type: 'Offering',
				level: 9,
				offerings: [offering('Lumenstone Adjuvant', 'OfferingOpenStateLocked')],
				bosses: [{ name: 'Ruin Serpent', ['kill_num']: 11 }],
			}),
			_exploration(7, 'The Chasm: Underground Mines', 941, {
				parentId: 6,
				offerings: [offering('Lumenstone Adjuvant', 'OfferingOpenStateLocked')],
				bosses: [{ name: 'Ruin Serpent', ['kill_num']: 11 }],
			}),
			_exploration(10, 'Chenyu Vale', 0, {
				type: 'Offering',
				level: 10,
				offerings: [offering('Rainjade Oblation', 'OfferingOpenStateUnlocked')],
			}),
			_exploration(11, 'Mt. Laixin', 558, { parentId: 10 }),
			_exploration(12, 'Chenyu Vale: Southern Mountain', 602, { parentId: 10 }),
			_exploration(3, 'Dragonspine', 995, {
				offerings: [offering('Frostbearing Tree', 'OfferingOpenStateUnknow')],
			}),
			_exploration(1, 'Mondstadt', 1000, { sevenStatueLevel: 10 }),
		];
		const display = [
			_display(2, [
				{ areaIds: [6, 7], explored: 862 },
				{ areaIds: [10, 11, 12], explored: 610 },
			]),
			_display(1, [{ areaIds: [3], explored: 995 }]),
		];
		globalThis.fetch = (async () => _infoResponse(raw, display)) as unknown as typeof fetch;
		const account = new Teyvat({ cookies: { ['account_id_v2']: '123' } }).account(UID);
		const explorations = (await account.info()).explorations;

		expect(explorations.map((value) => value.name)).toEqual(['Liyue', 'Mondstadt']);
		expect(explorations[0]?.sevenStatueLevel).toBe(9);
		expect(explorations[0]?.offerings).toEqual([{ name: 'Reputation', level: 4, icon: '', status: 'unknown' }]);
		expect(explorations[0]?.areas).toEqual([{ name: 'Galesong Hill', explored: 117.8 }]);
		expect(explorations[0]?.specialRegions.map((region) => [region.name, region.explored])).toEqual([
			['The Chasm', 86.2],
			['Chenyu Vale', 61],
		]);
		expect(explorations[0]?.specialRegions[0]?.areas).toEqual([
			{ name: 'The Chasm', explored: 54.8 },
			{ name: 'The Chasm: Underground Mines', explored: 94.1 },
		]);
		expect(explorations[0]?.specialRegions[0]?.offerings).toEqual([
			{ name: 'Lumenstone Adjuvant', level: 1, icon: 'offering.png', status: 'locked' },
		]);
		expect(explorations[0]?.specialRegions[0]?.bosses).toEqual([{ name: 'Ruin Serpent', kills: 11 }]);
		expect(explorations[0]?.specialRegions[1]?.areas).toEqual([
			{ name: 'Mt. Laixin', explored: 55.8 },
			{ name: 'Chenyu Vale: Southern Mountain', explored: 60.2 },
		]);
		expect(explorations[0]?.specialRegions[1]?.offerings[0]?.status).toBe('unlocked');
		expect(explorations[1]?.specialRegions[0]?.areas).toEqual([{ name: 'Dragonspine', explored: 99.5 }]);
		expect(explorations.some((value) => value.id === 99)).toBe(false);
		expect(explorations[0]).not.toHaveProperty('parentId');
		expect(explorations[0]).not.toHaveProperty('strategyUrl');
		expect(explorations[0]).not.toHaveProperty('worldType');
	});

	test('rejects missing exploration references', async () => {
		globalThis.fetch = (async () =>
			_infoResponse(
				[_exploration(1, 'Mondstadt', 1000)],
				[_display(1, [{ areaIds: [2], explored: 500 }])],
			)) as unknown as typeof fetch;
		const account = new Teyvat({ cookies: { ['account_id_v2']: '123' } }).account(UID);
		await expect(account.info()).rejects.toBeInstanceOf(TeyvatResponseValidationError);
	});

	test('rejects duplicate exploration references', async () => {
		globalThis.fetch = (async () =>
			_infoResponse(
				[_exploration(1, 'Mondstadt', 1000), _exploration(2, 'Dragonspine', 995)],
				[_display(1, [{ areaIds: [2, 2], explored: 995 }])],
			)) as unknown as typeof fetch;
		const account = new Teyvat({ cookies: { ['account_id_v2']: '123' } }).account(UID);
		await expect(account.info()).rejects.toBeInstanceOf(TeyvatResponseValidationError);
	});
});
