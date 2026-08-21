import { type } from 'arktype';
import type { TeyvatHttpClient } from '#/client/request.ts';
import { TEYVAT_DOMAINS } from '#/consts/domains.ts';
import { _hoyolabHeaders } from '#/endpoints/hoyolab/headers.ts';
import type { TeyvatServer } from '#/types/account/server.ts';
import type { TeyvatSpiralAbyssPeriod } from '#/types/account/spiral_abyss.ts';

const schemaRankedCharacter = type({
	['avatar_id']: 'number.integer',
	['avatar_icon']: 'string',
	rarity: 'number.integer',
	value: 'number.integer',
});

const schemaBattleCharacter = type({
	id: 'number.integer',
	icon: 'string',
	level: 'number.integer',
	rarity: 'number.integer',
});

const schemaEnemy = type({
	name: 'string',
	icon: 'string',
	level: 'number.integer',
});

const schemaBattle = type({
	index: 'number.integer',
	timestamp: 'string',
	avatars: schemaBattleCharacter.array(),
});

const schemaChamber = type({
	index: 'number.integer',
	star: 'number.integer',
	['max_star']: 'number.integer',
	battles: schemaBattle.array(),
	'top_half_floor_monster?': schemaEnemy.array(),
	'bottom_half_floor_monster?': schemaEnemy.array(),
});

const schemaFloor = type({
	index: 'number.integer',
	icon: 'string',
	['is_unlock']: 'boolean',
	star: 'number.integer',
	['max_star']: 'number.integer',
	levels: schemaChamber.array(),
});

const schemaHoyolabGenshinSpiralAbyssResponse = type({
	retcode: '0',
	message: 'string',
	data: {
		['schedule_id']: 'number.integer',
		['start_time']: 'string',
		['end_time']: 'string',
		['total_battle_times']: 'number.integer',
		['total_win_times']: 'number.integer',
		['max_floor']: 'string',
		['reveal_rank']: schemaRankedCharacter.array(),
		['defeat_rank']: schemaRankedCharacter.array(),
		['damage_rank']: schemaRankedCharacter.array(),
		['take_damage_rank']: schemaRankedCharacter.array(),
		['normal_skill_rank']: schemaRankedCharacter.array(),
		['energy_skill_rank']: schemaRankedCharacter.array(),
		floors: schemaFloor.array(),
		['total_star']: 'number.integer',
		['is_unlock']: 'boolean',
		['is_just_skipped_floor']: 'boolean',
		['skipped_floor']: 'string',
	},
});

export async function _getHoyolabGenshinSpiralAbyss(
	client: TeyvatHttpClient,
	uid: number,
	server: TeyvatServer,
	period: TeyvatSpiralAbyssPeriod,
) {
	return await client.request({
		domain: TEYVAT_DOMAINS.genshinRecord,
		path: 'spiralAbyss',
		params: { ['role_id']: uid, server, ['schedule_type']: period === 'current' ? 1 : 2 },
		schema: schemaHoyolabGenshinSpiralAbyssResponse,
		headers: _hoyolabHeaders(client.language),
	});
}
