import { type } from 'arktype';
import type { TeyvatHttpClient } from '#/client/request.ts';
import { TEYVAT_DOMAINS } from '#/consts/domains.ts';
import { _hoyolab_headers } from '#/endpoints/hoyolab/headers.ts';
import type { TeyvatServer } from '#/types/account/server.ts';

const schema_character = type({
	'id?': 'number.integer',
	'avatar_id?': 'number.integer',
	'icon?': 'string',
	'avatar_icon?': 'string',
	rarity: 'number.integer',
	'level?': 'number.integer',
	'avatar_type?': 'number.integer',
});

const schema_buff = type({
	id: 'number.integer',
	icon: 'string',
	name: 'string',
	desc: 'string',
	is_enhanced: 'boolean',
});

const schema_ranked_character = type({
	'avatar_id?': 'number.integer',
	'avatar_icon?': 'string',
	'rarity?': 'number.integer',
	'value?': 'string | number',
});

const schema_battle_statistics = type({
	max_defeat_avatar: schema_ranked_character.or('null'),
	max_damage_avatar: schema_ranked_character.or('null'),
	max_take_damage_avatar: schema_ranked_character.or('null'),
	shortest_avatar_list: schema_ranked_character.array(),
	total_use_time: 'number.integer',
});

const schema_act = type({
	round_id: 'number.integer',
	finish_time: 'number.integer',
	is_get_medal: 'boolean',
	'is_tarot?': 'boolean',
	'tarot_serial_no?': 'number.integer | null',
	avatars: schema_character.array(),
	choice_cards: schema_buff.array(),
	buffs: schema_buff.array(),
});

const schema_detail = type({
	'rounds_data?': schema_act.array(),
	'backup_avatars?': schema_character.array(),
	'fight_statisic?': schema_battle_statistics.or('null'),
});

const schema_season = type({
	has_data: 'boolean',
	has_detail_data: 'boolean',
	stat: {
		difficulty_id: 'number.integer',
		max_round_id: 'number.integer',
		heraldry: 'number.integer',
		get_medal_round_list: 'boolean[]',
		coin_num: 'number.integer',
		avatar_bonus_num: 'number.integer',
		rent_cnt: 'number.integer',
		medal_num: 'number.integer',
	},
	schedule: {
		schedule_id: 'number.integer',
		schedule_type: 'number.integer',
		start_time: 'number.integer',
		end_time: 'number.integer',
	},
	'detail?': schema_detail.or('null'),
});

export const schema_hoyolab_genshin_imaginarium_theater_response = type({
	retcode: '0',
	message: 'string',
	data: {
		is_unlock: 'boolean',
		data: schema_season.array(),
	},
});

export async function _get_hoyolab_genshin_imaginarium_theater(
	client: TeyvatHttpClient,
	uid: number,
	server: TeyvatServer,
) {
	return await client.request({
		domain: TEYVAT_DOMAINS.genshin_record,
		path: 'role_combat',
		params: { role_id: uid, server, need_detail: 'true' },
		schema: schema_hoyolab_genshin_imaginarium_theater_response,
		headers: _hoyolab_headers(client.language),
	});
}
