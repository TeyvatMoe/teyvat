import { type } from 'arktype';
import type { TeyvatHttpClient } from '../../../client/request.ts';
import { TEYVAT_DOMAINS } from '../../../consts/domains.ts';
import type { TeyvatServer } from '../../../types/account/server.ts';
import { _hoyolab_headers } from '../headers.ts';

const schema_date = type({
	year: 'number.integer',
	month: 'number.integer',
	day: 'number.integer',
	hour: 'number.integer',
	minute: 'number.integer',
	second: 'number.integer',
});

const schema_best_record = type({
	difficulty: 'number.integer',
	second: 'number.integer',
	icon: 'string',
});

const schema_character = type({
	avatar_id: 'number.integer',
	name: 'string',
	element: 'string',
	image: 'string',
	level: 'number.integer',
	rarity: 'number.integer',
	rank: 'number.integer',
});

const schema_best_character = type({
	avatar_id: 'number.integer',
	side_icon: 'string',
	dps: 'string',
	type: 'number.integer',
});

const schema_enemy_tag = type({
	type: 'number.integer',
	desc: 'string',
});

const schema_enemy = type({
	monster_id: 'number.integer',
	name: 'string',
	level: 'number.integer',
	icon: 'string',
	desc: 'string[]',
	tags: schema_enemy_tag.array(),
});

const schema_challenge = type({
	name: 'string',
	second: 'number.integer',
	teams: schema_character.array(),
	best_avatar: schema_best_character.array(),
	monster: schema_enemy,
});

const schema_mode = type({
	best: schema_best_record.or('null'),
	challenge: schema_challenge.array(),
	has_data: 'boolean',
});

const schema_season = type({
	schedule: {
		schedule_id: 'string',
		name: 'string',
		start_date_time: schema_date,
		end_date_time: schema_date,
		is_valid: 'boolean',
	},
	single: schema_mode,
	mp: schema_mode,
});

export const schema_hoyolab_genshin_stygian_onslaught_response = type({
	retcode: '0',
	message: 'string',
	data: {
		data: schema_season.array(),
	},
});

export async function _get_hoyolab_genshin_stygian_onslaught(
	client: TeyvatHttpClient,
	uid: number,
	server: TeyvatServer,
) {
	return await client.request({
		domain: TEYVAT_DOMAINS.genshin_record,
		path: 'hard_challenge',
		params: { role_id: uid, server, need_detail: 'true' },
		schema: schema_hoyolab_genshin_stygian_onslaught_response,
		headers: _hoyolab_headers(client.language),
	});
}
