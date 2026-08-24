import { afterEach, describe, expect, test } from 'bun:test';
import { Teyvat } from '#/client/teyvat.ts';

const originalFetch = globalThis.fetch;
const UID = 612_345_678;

afterEach(() => {
	globalThis.fetch = originalFetch;
});

function _infoResponse(): Response {
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
			['world_explorations']: [],
			homes: null,
		},
	});
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
});
