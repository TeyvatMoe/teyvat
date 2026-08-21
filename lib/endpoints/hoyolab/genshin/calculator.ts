import { type } from 'arktype';
import type { TeyvatHttpClient } from '#/client/request.ts';
import { TEYVAT_DOMAINS } from '#/consts/domains.ts';
import { _hoyolab_headers } from '#/endpoints/hoyolab/headers.ts';
import type { TeyvatServer } from '#/types/account/server.ts';

const schema_calculator_character = type({
	id: 'number.integer',
	name: 'string',
	icon: 'string',
	avatar_level: 'number.integer',
	element_attr_id: 'number.integer',
	weapon_cat_id: 'number.integer',
	level_current: 'number.integer',
	max_level: 'number.integer',
});

const schema_calculator_weapon = type({
	id: 'number.integer',
	name: 'string',
	icon: 'string',
	weapon_level: 'number.integer',
	weapon_cat_id: 'number.integer',
	level_current: 'number.integer',
	max_level: 'number.integer',
});

const schema_calculator_talent = type({
	id: 'number.integer',
	group_id: 'number.integer',
	name: 'string',
	icon: 'string',
	level_current: 'number.integer',
	max_level: 'number.integer',
});

const schema_calculator_artifact = type({
	id: 'number.integer',
	name: 'string',
	icon: 'string',
	reliquary_level: 'number.integer',
	reliquary_cat_id: 'number.integer',
	level_current: 'number.integer',
	max_level: 'number.integer',
});

const schema_material = type({
	id: 'number.integer',
	name: 'string',
	icon: 'string',
	level: 'number.integer',
	num: 'number.integer',
	'lack_num?': 'number.integer',
	'wiki_url?': 'string',
});

const schema_talent_result = type({
	skill_info: {
		id: 'number.integer',
		level_current: 'number.integer',
		level_target: 'number.integer',
	},
	consume_list: schema_material.array(),
});

const schema_artifact_result = type({
	reliquary_id: 'number.integer',
	id_consume_list: schema_material.array(),
});

const schema_single_result = type({
	avatar_consume: schema_material.array(),
	weapon_consume: schema_material.array(),
	skills_consume: schema_talent_result.array(),
	reliquary_consume: schema_artifact_result.array(),
	'lineup_recommend?': 'string',
});

export const schema_hoyolab_calculator_characters_response = type({
	retcode: '0',
	message: 'string',
	data: { list: schema_calculator_character.array() },
});

export const schema_hoyolab_calculator_character_response = type({
	retcode: '0',
	message: 'string',
	data: {
		weapon: schema_calculator_weapon,
		skill_list: schema_calculator_talent.array(),
		reliquary_list: schema_calculator_artifact.array(),
	},
});

export const schema_hoyolab_calculator_batch_response = type({
	retcode: '0',
	message: 'string',
	data: {
		items: schema_single_result.array(),
		available_material: schema_material.array(),
		overall_consume: schema_material.array(),
		has_user_info: 'boolean',
	},
});

export const schema_hoyolab_calculator_auth_response = type({ retcode: '0', message: 'string', data: 'unknown' });

function _calculator_headers(client: TeyvatHttpClient): Record<string, string> {
	return {
		..._hoyolab_headers(client.language),
		Origin: 'https://act.hoyolab.com',
		Referer: 'https://act.hoyolab.com/',
	};
}

export async function _get_hoyolab_calculator_characters(client: TeyvatHttpClient, uid: number, server: TeyvatServer) {
	return await client.request({
		domain: TEYVAT_DOMAINS.genshin_calculator,
		path: 'v1/sync/avatar/list',
		method: 'POST',
		body: {
			page: 1,
			size: 200,
			uid,
			region: server,
			element_attr_ids: [],
			weapon_cat_ids: [],
			lang: client.language,
		},
		schema: schema_hoyolab_calculator_characters_response,
		headers: _calculator_headers(client),
	});
}

export async function _get_hoyolab_calculator_character(
	client: TeyvatHttpClient,
	uid: number,
	server: TeyvatServer,
	character_id: number,
) {
	return await client.request({
		domain: TEYVAT_DOMAINS.genshin_calculator,
		path: 'v1/sync/avatar/detail',
		params: { avatar_id: character_id, uid, region: server, lang: client.language },
		schema: schema_hoyolab_calculator_character_response,
		headers: _calculator_headers(client),
	});
}

export async function _calculate_hoyolab_progression(
	client: TeyvatHttpClient,
	uid: number,
	server: TeyvatServer,
	calculation: unknown,
) {
	return await client.request({
		domain: TEYVAT_DOMAINS.genshin_calculator,
		path: 'v3/batch_compute',
		method: 'POST',
		body: { uid, region: server, items: [calculation], lang: client.language },
		schema: schema_hoyolab_calculator_batch_response,
		headers: _calculator_headers(client),
	});
}

export async function _enable_hoyolab_calculator_sync(client: TeyvatHttpClient): Promise<void> {
	await client.request({
		domain: TEYVAT_DOMAINS.genshin_calculator,
		path: 'v1/avatar/auth',
		method: 'POST',
		body: { avatar_auth: 1, lang: client.language },
		schema: schema_hoyolab_calculator_auth_response,
		headers: _calculator_headers(client),
	});
}
