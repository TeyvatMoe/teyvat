import { type } from 'arktype';
import type { TeyvatHttpClient } from '#/client/request.ts';
import { TEYVAT_DOMAINS } from '#/consts/domains.ts';
import { _hoyolabHeaders } from '#/endpoints/hoyolab/headers.ts';
import type { TeyvatServer } from '#/types/account/server.ts';

const schemaCharacter = type({
	id: 'number.integer',
	icon: 'string',
	name: 'string',
	element: 'string',
	rarity: 'number.integer',
});

const schemaWeapon = type({
	id: 'number.integer',
	icon: 'string',
	rarity: 'number.integer',
	name: 'string',
	['wiki_url']: 'string',
});

const schemaDate = type({
	year: 'number.integer',
	month: 'number.integer',
	day: 'number.integer',
	hour: 'number.integer',
	minute: 'number.integer',
	second: 'number.integer',
});

const schemaBanner = type({
	['pool_id']: 'number.integer',
	['version_name']: 'string',
	['pool_name']: 'string',
	['pool_type']: 'number.integer',
	avatars: schemaCharacter.array(),
	weapon: schemaWeapon.array(),
	['start_timestamp']: 'number.integer | string',
	['end_timestamp']: 'number.integer | string',
	'start_time?': schemaDate,
	'end_time?': schemaDate,
	['jump_url']: 'string',
	['pool_status']: 'number.integer',
	['countdown_seconds']: 'number.integer',
});

const schemaReward = type({
	['item_id']: 'number.integer',
	name: 'string',
	icon: 'string',
	['wiki_url']: 'string',
	num: 'number.integer',
	rarity: 'number.integer | string',
	['homepage_show']: 'boolean',
});

const schemaActivity = type({
	id: 'number.integer',
	name: 'string',
	desc: 'string',
	strategy: 'string',
	type: 'string',
	['start_timestamp']: 'number.integer | string',
	['end_timestamp']: 'number.integer | string',
	'start_time?': schemaDate.or('null'),
	'end_time?': schemaDate.or('null'),
	status: 'number.integer',
	['countdown_seconds']: 'number.integer',
	['reward_list']: schemaReward.array(),
	['is_finished']: 'boolean',
	'explore_detail?': type({ ['explore_percent']: 'number', ['is_finished']: 'boolean' }).or('null'),
	'double_detail?': type({ total: 'number.integer', left: 'number.integer' }).or('null'),
	'tower_detail?': type({
		['is_unlock']: 'boolean',
		['max_star']: 'number.integer',
		['total_star']: 'number.integer',
		['has_data']: 'boolean',
	}).or('null'),
	'role_combat_detail?': type({
		['is_unlock']: 'boolean',
		['max_round_id']: 'number.integer',
		['has_data']: 'boolean',
	}).or('null'),
});

const schemaHoyolabGenshinCalendarResponse = type({
	retcode: '0',
	message: 'string',
	data: {
		['avatar_card_pool_list']: schemaBanner.array(),
		['weapon_card_pool_list']: schemaBanner.array(),
		['mixed_card_pool_list']: schemaBanner.array(),
		['act_list']: schemaActivity.array(),
		['fixed_act_list']: schemaActivity.array(),
	},
});

export async function _getHoyolabGenshinCalendar(client: TeyvatHttpClient, uid: number, server: TeyvatServer) {
	return await client.request({
		domain: TEYVAT_DOMAINS.genshinRecord,
		path: 'act_calendar',
		method: 'POST',
		body: { ['role_id']: uid, server },
		schema: schemaHoyolabGenshinCalendarResponse,
		headers: _hoyolabHeaders(client.language),
	});
}
