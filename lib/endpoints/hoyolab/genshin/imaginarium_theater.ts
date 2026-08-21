import { type } from 'arktype';
import type { TeyvatHttpClient } from '#/client/request.ts';
import { TEYVAT_DOMAINS } from '#/consts/domains.ts';
import { _hoyolabHeaders } from '#/endpoints/hoyolab/headers.ts';
import type { TeyvatServer } from '#/types/account/server.ts';

const schemaCharacter = type({
	'id?': 'number.integer',
	'avatar_id?': 'number.integer',
	'icon?': 'string',
	'avatar_icon?': 'string',
	rarity: 'number.integer',
	'level?': 'number.integer',
	'avatar_type?': 'number.integer',
});

const schemaBuff = type({
	id: 'number.integer',
	icon: 'string',
	name: 'string',
	desc: 'string',
	['is_enhanced']: 'boolean',
});

const schemaRankedCharacter = type({
	'avatar_id?': 'number.integer',
	'avatar_icon?': 'string',
	'rarity?': 'number.integer',
	'value?': 'string | number',
});

const schemaBattleStatistics = type({
	['max_defeat_avatar']: schemaRankedCharacter.or('null'),
	['max_damage_avatar']: schemaRankedCharacter.or('null'),
	['max_take_damage_avatar']: schemaRankedCharacter.or('null'),
	['shortest_avatar_list']: schemaRankedCharacter.array(),
	['total_use_time']: 'number.integer',
});

const schemaAct = type({
	['round_id']: 'number.integer',
	['finish_time']: 'number.integer',
	['is_get_medal']: 'boolean',
	'is_tarot?': 'boolean',
	'tarot_serial_no?': 'number.integer | null',
	avatars: schemaCharacter.array(),
	['choice_cards']: schemaBuff.array(),
	buffs: schemaBuff.array(),
});

const schemaDetail = type({
	'rounds_data?': schemaAct.array(),
	'backup_avatars?': schemaCharacter.array(),
	'fight_statisic?': schemaBattleStatistics.or('null'),
});

const schemaSeason = type({
	['has_data']: 'boolean',
	['has_detail_data']: 'boolean',
	stat: {
		['difficulty_id']: 'number.integer',
		['max_round_id']: 'number.integer',
		heraldry: 'number.integer',
		['get_medal_round_list']: 'boolean[]',
		['coin_num']: 'number.integer',
		['avatar_bonus_num']: 'number.integer',
		['rent_cnt']: 'number.integer',
		['medal_num']: 'number.integer',
	},
	schedule: {
		['schedule_id']: 'number.integer',
		['schedule_type']: 'number.integer',
		['start_time']: 'number.integer | string',
		['end_time']: 'number.integer | string',
	},
	'detail?': schemaDetail.or('null'),
});

const schemaHoyolabGenshinImaginariumTheaterResponse = type({
	retcode: '0',
	message: 'string',
	data: {
		['is_unlock']: 'boolean',
		data: schemaSeason.array(),
	},
});

export async function _getHoyolabGenshinImaginariumTheater(
	client: TeyvatHttpClient,
	uid: number,
	server: TeyvatServer,
) {
	return await client.request({
		domain: TEYVAT_DOMAINS.genshinRecord,
		path: 'role_combat',
		params: { ['role_id']: uid, server, ['need_detail']: 'true' },
		schema: schemaHoyolabGenshinImaginariumTheaterResponse,
		headers: _hoyolabHeaders(client.language),
	});
}
