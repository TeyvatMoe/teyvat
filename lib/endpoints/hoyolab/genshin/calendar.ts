import { type } from 'arktype';
import type { TeyvatHttpClient } from '../../../client/request.ts';
import { TEYVAT_DOMAINS } from '../../../consts/domains.ts';
import type { TeyvatServer } from '../../../types/account/server.ts';
import { _hoyolab_headers } from '../headers.ts';

const schema_character = type({
	id: 'number.integer',
	icon: 'string',
	name: 'string',
	element: 'string',
	rarity: 'number.integer',
});

const schema_weapon = type({
	id: 'number.integer',
	icon: 'string',
	rarity: 'number.integer',
	name: 'string',
	wiki_url: 'string',
});

const schema_date = type({
	year: 'number.integer',
	month: 'number.integer',
	day: 'number.integer',
	hour: 'number.integer',
	minute: 'number.integer',
	second: 'number.integer',
});

const schema_banner = type({
	pool_id: 'number.integer',
	version_name: 'string',
	pool_name: 'string',
	pool_type: 'number.integer',
	avatars: schema_character.array(),
	weapon: schema_weapon.array(),
	start_timestamp: 'number.integer | string',
	end_timestamp: 'number.integer | string',
	'start_time?': schema_date,
	'end_time?': schema_date,
	jump_url: 'string',
	pool_status: 'number.integer',
	countdown_seconds: 'number.integer',
});

const schema_reward = type({
	item_id: 'number.integer',
	name: 'string',
	icon: 'string',
	wiki_url: 'string',
	num: 'number.integer',
	rarity: 'number.integer | string',
	homepage_show: 'boolean',
});

const schema_activity = type({
	id: 'number.integer',
	name: 'string',
	desc: 'string',
	strategy: 'string',
	type: 'string',
	start_timestamp: 'number.integer | string',
	end_timestamp: 'number.integer | string',
	'start_time?': schema_date.or('null'),
	'end_time?': schema_date.or('null'),
	status: 'number.integer',
	countdown_seconds: 'number.integer',
	reward_list: schema_reward.array(),
	is_finished: 'boolean',
	'explore_detail?': type({ explore_percent: 'number', is_finished: 'boolean' }).or('null'),
	'double_detail?': type({ total: 'number.integer', left: 'number.integer' }).or('null'),
	'tower_detail?': type({
		is_unlock: 'boolean',
		max_star: 'number.integer',
		total_star: 'number.integer',
		has_data: 'boolean',
	}).or('null'),
	'role_combat_detail?': type({
		is_unlock: 'boolean',
		max_round_id: 'number.integer',
		has_data: 'boolean',
	}).or('null'),
});

export const schema_hoyolab_genshin_calendar_response = type({
	retcode: '0',
	message: 'string',
	data: {
		avatar_card_pool_list: schema_banner.array(),
		weapon_card_pool_list: schema_banner.array(),
		mixed_card_pool_list: schema_banner.array(),
		act_list: schema_activity.array(),
		fixed_act_list: schema_activity.array(),
	},
});

export async function _get_hoyolab_genshin_calendar(client: TeyvatHttpClient, uid: number, server: TeyvatServer) {
	return await client.request({
		domain: TEYVAT_DOMAINS.genshin_record,
		path: 'act_calendar',
		method: 'POST',
		body: { role_id: uid, server },
		schema: schema_hoyolab_genshin_calendar_response,
		headers: _hoyolab_headers(),
	});
}
