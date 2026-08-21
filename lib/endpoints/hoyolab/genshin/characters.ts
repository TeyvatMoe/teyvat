import { type } from 'arktype';
import type { TeyvatHttpClient } from '#/client/request.ts';
import { TEYVAT_DOMAINS } from '#/consts/domains.ts';
import { _hoyolabHeaders } from '#/endpoints/hoyolab/headers.ts';
import type { TeyvatServer } from '#/types/account/server.ts';

const schemaPropertyInfo = type({
	['property_type']: 'number.integer',
	name: 'string',
	icon: 'string | null',
	['filter_name']: 'string',
});

const schemaPropertyValue = type({
	['property_type']: 'number.integer',
	base: 'string',
	add: 'string',
	final: 'string',
});

const schemaArtifactProperty = type({
	['property_type']: 'number.integer',
	value: 'string',
	times: 'number.integer',
});

const schemaBaseWeapon = type({
	id: 'number.integer',
	icon: 'string',
	type: 'number.integer',
	rarity: 'number.integer',
	level: 'number.integer',
	['affix_level']: 'number.integer',
	name: 'string',
});

const schemaCharacterBase = type({
	id: 'number.integer',
	icon: 'string',
	name: 'string',
	element: 'string',
	fetter: 'number.integer',
	level: 'number.integer',
	rarity: 'number.integer',
	['actived_constellation_num']: 'number.integer',
	image: 'string',
	['is_chosen']: 'boolean',
	['side_icon']: 'string',
	['weapon_type']: 'number.integer',
	weapon: schemaBaseWeapon,
});

const schemaDetailedWeapon = type({
	id: 'number.integer',
	name: 'string',
	icon: 'string',
	type: 'number.integer',
	rarity: 'number.integer',
	level: 'number.integer',
	['promote_level']: 'number.integer',
	['type_name']: 'string',
	desc: 'string',
	['affix_level']: 'number.integer',
	['main_property']: schemaPropertyValue,
	['sub_property']: schemaPropertyValue.or('null'),
});

const schemaArtifact = type({
	id: 'number.integer',
	name: 'string',
	icon: 'string',
	pos: 'number.integer',
	rarity: 'number.integer',
	level: 'number.integer',
	set: {
		id: 'number.integer',
		name: 'string',
		affixes: type({
			['activation_number']: 'number.integer',
			effect: 'string',
			'enabled?': 'boolean',
		}).array(),
	},
	['pos_name']: 'string',
	['main_property']: schemaArtifactProperty,
	['sub_property_list']: schemaArtifactProperty.array(),
});

const schemaConstellation = type({
	id: 'number.integer',
	name: 'string',
	icon: 'string',
	effect: 'string',
	['is_actived']: 'boolean',
	pos: 'number.integer',
	['is_enhanced']: 'boolean',
	['enhanced_effect']: 'string',
	['can_enhanced']: 'boolean',
});

const schemaCostume = type({ id: 'number.integer', name: 'string', icon: 'string' });

const schemaSkill = type({
	['skill_id']: 'number.integer',
	['skill_type']: 'number.integer',
	level: 'number.integer',
	desc: 'string',
	['skill_affix_list']: type({ name: 'string', value: 'string' }).array(),
	icon: 'string',
	['is_unlock']: 'boolean',
	name: 'string',
	['is_enhanced']: 'boolean',
	['enhanced_desc']: 'string',
	['before_enhanced_skill_attr_index']: type('number.integer').array(),
	['after_enhanced_skill_attr_index']: type('number.integer').array(),
	['can_enhanced']: 'boolean',
});

export const schemaHoyolabGenshinCharacterListResponse = type({
	retcode: '0',
	message: 'string',
	data: { list: schemaCharacterBase.array() },
});

export const schemaHoyolabGenshinCharacterDetailsResponse = type({
	retcode: '0',
	message: 'string',
	data: {
		list: type({
			base: schemaCharacterBase,
			weapon: schemaDetailedWeapon,
			relics: schemaArtifact.array(),
			constellations: schemaConstellation.array(),
			costumes: schemaCostume.array(),
			['selected_properties']: schemaPropertyValue.array(),
			['base_properties']: schemaPropertyValue.array(),
			['extra_properties']: schemaPropertyValue.array(),
			['element_properties']: schemaPropertyValue.array(),
			skills: schemaSkill.array(),
			['recommend_relic_property']: 'unknown',
			['weapon_skin']: 'unknown',
			['unlock_tps']: 'boolean',
		}).array(),
		['property_map']: type.Record('string', schemaPropertyInfo),
		['relic_property_options']: type.Record('string', type('number.integer').array()),
		['relic_wiki']: type.Record('string', 'string'),
		['weapon_wiki']: type.Record('string', 'string'),
		['avatar_wiki']: type.Record('string', 'string'),
	},
});

const schemaHoyolabGenshinCharacterTopResponse = type({
	retcode: '0',
	message: 'string',
	data: 'unknown',
});

export async function _getHoyolabGenshinCharacterList(client: TeyvatHttpClient, uid: number, server: TeyvatServer) {
	return await client.request({
		domain: TEYVAT_DOMAINS.genshinRecord,
		path: 'character/list',
		method: 'POST',
		body: { ['role_id']: uid, server },
		schema: schemaHoyolabGenshinCharacterListResponse,
		headers: _hoyolabHeaders(client.language),
	});
}

export async function _setHoyolabGenshinShowcase(
	client: TeyvatHttpClient,
	uid: number,
	server: TeyvatServer,
	characterIds: number[],
): Promise<void> {
	await client.request({
		domain: TEYVAT_DOMAINS.genshinRecord,
		path: 'character/top',
		method: 'POST',
		body: {
			['avatar_ids']: characterIds,
			['role_id']: uid,
			server,
			['uid_key']: uid,
			['server_key']: server,
		},
		schema: schemaHoyolabGenshinCharacterTopResponse,
		headers: _hoyolabHeaders(client.language),
		replayAuth: false,
	});
}

export async function _getHoyolabGenshinCharacterDetails(
	client: TeyvatHttpClient,
	uid: number,
	server: TeyvatServer,
	characterIds: number[],
) {
	return await client.request({
		domain: TEYVAT_DOMAINS.genshinRecord,
		path: 'character/detail',
		method: 'POST',
		body: { ['role_id']: uid, server, ['character_ids']: characterIds },
		schema: schemaHoyolabGenshinCharacterDetailsResponse,
		headers: _hoyolabHeaders(client.language),
	});
}
