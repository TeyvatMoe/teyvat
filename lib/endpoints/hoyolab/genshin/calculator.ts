import { type } from 'arktype';
import type { TeyvatHttpClient } from '#/client/request.ts';
import { TEYVAT_DOMAINS } from '#/consts/domains.ts';
import { _hoyolabHeaders } from '#/endpoints/hoyolab/headers.ts';
import type { TeyvatServer } from '#/types/account/server.ts';

const schemaCalculatorCharacter = type({
	id: 'number.integer',
	name: 'string',
	icon: 'string',
	['avatar_level']: 'number.integer',
	['element_attr_id']: 'number.integer',
	['weapon_cat_id']: 'number.integer',
	['level_current']: 'number.integer',
	['max_level']: 'number.integer',
});

const schemaCalculatorWeapon = type({
	id: 'number.integer',
	name: 'string',
	icon: 'string',
	['weapon_level']: 'number.integer',
	['weapon_cat_id']: 'number.integer',
	['level_current']: 'number.integer',
	['max_level']: 'number.integer',
});

const schemaCalculatorTalent = type({
	id: 'number.integer',
	['group_id']: 'number.integer',
	name: 'string',
	icon: 'string',
	['level_current']: 'number.integer',
	['max_level']: 'number.integer',
});

const schemaCalculatorArtifact = type({
	id: 'number.integer',
	name: 'string',
	icon: 'string',
	['reliquary_level']: 'number.integer',
	['reliquary_cat_id']: 'number.integer',
	['level_current']: 'number.integer',
	['max_level']: 'number.integer',
});

const schemaMaterial = type({
	id: 'number.integer',
	name: 'string',
	icon: 'string',
	level: 'number.integer',
	num: 'number.integer',
	'lack_num?': 'number.integer',
	'wiki_url?': 'string',
});

const schemaTalentResult = type({
	['skill_info']: {
		id: 'number.integer',
		['level_current']: 'number.integer',
		['level_target']: 'number.integer',
	},
	['consume_list']: schemaMaterial.array(),
});

const schemaArtifactResult = type({
	['reliquary_id']: 'number.integer',
	['id_consume_list']: schemaMaterial.array(),
});

const schemaSingleResult = type({
	['avatar_consume']: schemaMaterial.array(),
	['weapon_consume']: schemaMaterial.array(),
	['skills_consume']: schemaTalentResult.array(),
	['reliquary_consume']: schemaArtifactResult.array(),
	'lineup_recommend?': 'string',
});

export const schemaHoyolabCalculatorCharactersResponse = type({
	retcode: '0',
	message: 'string',
	data: { list: schemaCalculatorCharacter.array() },
});

export const schemaHoyolabCalculatorCharacterResponse = type({
	retcode: '0',
	message: 'string',
	data: {
		weapon: schemaCalculatorWeapon,
		['skill_list']: schemaCalculatorTalent.array(),
		['reliquary_list']: schemaCalculatorArtifact.array(),
	},
});

export const schemaHoyolabCalculatorBatchResponse = type({
	retcode: '0',
	message: 'string',
	data: {
		items: schemaSingleResult.array(),
		['available_material']: schemaMaterial.array(),
		['overall_consume']: schemaMaterial.array(),
		['has_user_info']: 'boolean',
	},
});

export const schemaHoyolabCalculatorAuthResponse = type({ retcode: '0', message: 'string', data: 'unknown' });

function _calculatorHeaders(client: TeyvatHttpClient): Record<string, string> {
	return {
		..._hoyolabHeaders(client.language),
		['Origin']: 'https://act.hoyolab.com',
		['Referer']: 'https://act.hoyolab.com/',
	};
}

export async function _getHoyolabCalculatorCharacters(client: TeyvatHttpClient, uid: number, server: TeyvatServer) {
	return await client.request({
		domain: TEYVAT_DOMAINS.genshinCalculator,
		path: 'v1/sync/avatar/list',
		method: 'POST',
		body: {
			page: 1,
			size: 200,
			uid,
			region: server,
			['element_attr_ids']: [],
			['weapon_cat_ids']: [],
			lang: client.language,
		},
		schema: schemaHoyolabCalculatorCharactersResponse,
		headers: _calculatorHeaders(client),
	});
}

export async function _getHoyolabCalculatorCharacter(
	client: TeyvatHttpClient,
	uid: number,
	server: TeyvatServer,
	characterId: number,
) {
	return await client.request({
		domain: TEYVAT_DOMAINS.genshinCalculator,
		path: 'v1/sync/avatar/detail',
		params: { ['avatar_id']: characterId, uid, region: server, lang: client.language },
		schema: schemaHoyolabCalculatorCharacterResponse,
		headers: _calculatorHeaders(client),
	});
}

export async function _calculateHoyolabProgression(
	client: TeyvatHttpClient,
	uid: number,
	server: TeyvatServer,
	calculation: unknown,
) {
	return await client.request({
		domain: TEYVAT_DOMAINS.genshinCalculator,
		path: 'v3/batch_compute',
		method: 'POST',
		body: { uid, region: server, items: [calculation], lang: client.language },
		schema: schemaHoyolabCalculatorBatchResponse,
		headers: _calculatorHeaders(client),
	});
}

export async function _enableHoyolabCalculatorSync(client: TeyvatHttpClient): Promise<void> {
	await client.request({
		domain: TEYVAT_DOMAINS.genshinCalculator,
		path: 'v1/avatar/auth',
		method: 'POST',
		body: { ['avatar_auth']: 1, lang: client.language },
		schema: schemaHoyolabCalculatorAuthResponse,
		headers: _calculatorHeaders(client),
	});
}
