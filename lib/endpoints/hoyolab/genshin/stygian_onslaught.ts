import { type } from 'arktype';
import type { TeyvatHttpClient } from '#/client/request.ts';
import { TEYVAT_DOMAINS } from '#/consts/domains.ts';
import { _hoyolabHeaders } from '#/endpoints/hoyolab/headers.ts';
import type { TeyvatServer } from '#/types/account/server.ts';

const schemaDate = type({
	year: 'number.integer',
	month: 'number.integer',
	day: 'number.integer',
	hour: 'number.integer',
	minute: 'number.integer',
	second: 'number.integer',
});

const schemaBestRecord = type({
	difficulty: 'number.integer',
	second: 'number.integer',
	icon: 'string',
});

const schemaCharacter = type({
	['avatar_id']: 'number.integer',
	name: 'string',
	element: 'string',
	image: 'string',
	level: 'number.integer',
	rarity: 'number.integer',
	rank: 'number.integer',
});

const schemaBestCharacter = type({
	['avatar_id']: 'number.integer',
	['side_icon']: 'string',
	dps: 'string',
	type: 'number.integer',
});

const schemaEnemyTag = type({
	type: 'number.integer',
	desc: 'string',
});

const schemaEnemy = type({
	['monster_id']: 'number.integer',
	name: 'string',
	level: 'number.integer',
	icon: 'string',
	desc: 'string[]',
	tags: schemaEnemyTag.array(),
});

const schemaChallenge = type({
	name: 'string',
	second: 'number.integer',
	teams: schemaCharacter.array(),
	['best_avatar']: schemaBestCharacter.array(),
	monster: schemaEnemy,
});

const schemaMode = type({
	best: schemaBestRecord.or('null'),
	challenge: schemaChallenge.array(),
	['has_data']: 'boolean',
});

const schemaSeason = type({
	schedule: {
		['schedule_id']: 'string',
		name: 'string',
		['start_date_time']: schemaDate,
		['end_date_time']: schemaDate,
		['is_valid']: 'boolean',
	},
	single: schemaMode,
	mp: schemaMode,
});

const schemaHoyolabGenshinStygianOnslaughtResponse = type({
	retcode: '0',
	message: 'string',
	data: {
		data: schemaSeason.array(),
	},
});

export async function _getHoyolabGenshinStygianOnslaught(client: TeyvatHttpClient, uid: number, server: TeyvatServer) {
	return await client.request({
		domain: TEYVAT_DOMAINS.genshinRecord,
		path: 'hard_challenge',
		params: { ['role_id']: uid, server, ['need_detail']: 'true' },
		schema: schemaHoyolabGenshinStygianOnslaughtResponse,
		headers: _hoyolabHeaders(client.language),
	});
}
