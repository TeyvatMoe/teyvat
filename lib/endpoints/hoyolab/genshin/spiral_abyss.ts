import { type } from 'arktype';
import type { TeyvatHttpClient } from '#/client/request.ts';
import { TEYVAT_DOMAINS } from '#/consts/domains.ts';
import { _hoyolab_headers } from '#/endpoints/hoyolab/headers.ts';
import type { TeyvatServer } from '#/types/account/server.ts';
import type { TeyvatSpiralAbyssPeriod } from '#/types/account/spiral_abyss.ts';

const schema_ranked_character = type({
	avatar_id: 'number.integer',
	avatar_icon: 'string',
	rarity: 'number.integer',
	value: 'number.integer',
});

const schema_battle_character = type({
	id: 'number.integer',
	icon: 'string',
	level: 'number.integer',
	rarity: 'number.integer',
});

const schema_enemy = type({
	name: 'string',
	icon: 'string',
	level: 'number.integer',
});

const schema_battle = type({
	index: 'number.integer',
	timestamp: 'string',
	avatars: schema_battle_character.array(),
});

const schema_chamber = type({
	index: 'number.integer',
	star: 'number.integer',
	max_star: 'number.integer',
	battles: schema_battle.array(),
	'top_half_floor_monster?': schema_enemy.array(),
	'bottom_half_floor_monster?': schema_enemy.array(),
});

const schema_floor = type({
	index: 'number.integer',
	icon: 'string',
	is_unlock: 'boolean',
	star: 'number.integer',
	max_star: 'number.integer',
	levels: schema_chamber.array(),
});

export const schema_hoyolab_genshin_spiral_abyss_response = type({
	retcode: '0',
	message: 'string',
	data: {
		schedule_id: 'number.integer',
		start_time: 'string',
		end_time: 'string',
		total_battle_times: 'number.integer',
		total_win_times: 'number.integer',
		max_floor: 'string',
		reveal_rank: schema_ranked_character.array(),
		defeat_rank: schema_ranked_character.array(),
		damage_rank: schema_ranked_character.array(),
		take_damage_rank: schema_ranked_character.array(),
		normal_skill_rank: schema_ranked_character.array(),
		energy_skill_rank: schema_ranked_character.array(),
		floors: schema_floor.array(),
		total_star: 'number.integer',
		is_unlock: 'boolean',
		is_just_skipped_floor: 'boolean',
		skipped_floor: 'string',
	},
});

export async function _get_hoyolab_genshin_spiral_abyss(
	client: TeyvatHttpClient,
	uid: number,
	server: TeyvatServer,
	period: TeyvatSpiralAbyssPeriod,
) {
	return await client.request({
		domain: TEYVAT_DOMAINS.genshin_record,
		path: 'spiralAbyss',
		params: { role_id: uid, server, schedule_type: period === 'current' ? 1 : 2 },
		schema: schema_hoyolab_genshin_spiral_abyss_response,
		headers: _hoyolab_headers(client.language),
	});
}
