import { type } from 'arktype';
import type { TeyvatHttpClient } from '../../../client/request.ts';
import { TEYVAT_DOMAINS } from '../../../consts/domains.ts';
import type { TeyvatServer } from '../../../types/account/server.ts';
import { _hoyolab_headers } from '../headers.ts';

const schema_property_info = type({
	property_type: 'number.integer',
	name: 'string',
	icon: 'string | null',
	filter_name: 'string',
});

const schema_property_value = type({
	property_type: 'number.integer',
	base: 'string',
	add: 'string',
	final: 'string',
});

const schema_artifact_property = type({
	property_type: 'number.integer',
	value: 'string',
	times: 'number.integer',
});

const schema_base_weapon = type({
	id: 'number.integer',
	icon: 'string',
	type: 'number.integer',
	rarity: 'number.integer',
	level: 'number.integer',
	affix_level: 'number.integer',
	name: 'string',
});

const schema_character_base = type({
	id: 'number.integer',
	icon: 'string',
	name: 'string',
	element: 'string',
	fetter: 'number.integer',
	level: 'number.integer',
	rarity: 'number.integer',
	actived_constellation_num: 'number.integer',
	image: 'string',
	is_chosen: 'boolean',
	side_icon: 'string',
	weapon_type: 'number.integer',
	weapon: schema_base_weapon,
});

const schema_detailed_weapon = type({
	id: 'number.integer',
	name: 'string',
	icon: 'string',
	type: 'number.integer',
	rarity: 'number.integer',
	level: 'number.integer',
	promote_level: 'number.integer',
	type_name: 'string',
	desc: 'string',
	affix_level: 'number.integer',
	main_property: schema_property_value,
	sub_property: schema_property_value.or('null'),
});

const schema_artifact = type({
	id: 'number.integer',
	name: 'string',
	icon: 'string',
	pos: 'number.integer',
	rarity: 'number.integer',
	level: 'number.integer',
	set: {
		id: 'number.integer',
		name: 'string',
		affixes: [
			{
				activation_number: 'number.integer',
				effect: 'string',
				'enabled?': 'boolean',
			},
			'[]',
		],
	},
	pos_name: 'string',
	main_property: schema_artifact_property,
	sub_property_list: [schema_artifact_property, '[]'],
});

const schema_constellation = type({
	id: 'number.integer',
	name: 'string',
	icon: 'string',
	effect: 'string',
	is_actived: 'boolean',
	pos: 'number.integer',
	is_enhanced: 'boolean',
	enhanced_effect: 'string',
	can_enhanced: 'boolean',
});

const schema_costume = type({ id: 'number.integer', name: 'string', icon: 'string' });

const schema_skill = type({
	skill_id: 'number.integer',
	skill_type: 'number.integer',
	level: 'number.integer',
	desc: 'string',
	skill_affix_list: [{ name: 'string', value: 'string' }, '[]'],
	icon: 'string',
	is_unlock: 'boolean',
	name: 'string',
	is_enhanced: 'boolean',
	enhanced_desc: 'string',
	before_enhanced_skill_attr_index: ['number.integer', '[]'],
	after_enhanced_skill_attr_index: ['number.integer', '[]'],
	can_enhanced: 'boolean',
});

export const schema_hoyolab_genshin_character_list_response = type({
	retcode: '0',
	message: 'string',
	data: { list: [schema_character_base, '[]'] },
});

export const schema_hoyolab_genshin_character_details_response = type({
	retcode: '0',
	message: 'string',
	data: {
		list: [
			{
				base: schema_character_base,
				weapon: schema_detailed_weapon,
				relics: [schema_artifact, '[]'],
				constellations: [schema_constellation, '[]'],
				costumes: [schema_costume, '[]'],
				selected_properties: [schema_property_value, '[]'],
				base_properties: [schema_property_value, '[]'],
				extra_properties: [schema_property_value, '[]'],
				element_properties: [schema_property_value, '[]'],
				skills: [schema_skill, '[]'],
				recommend_relic_property: 'unknown',
				weapon_skin: 'unknown',
				unlock_tps: 'boolean',
			},
			'[]',
		],
		property_map: type.Record('string', schema_property_info),
		relic_property_options: type.Record('string', ['number.integer', '[]']),
		relic_wiki: type.Record('string', 'string'),
		weapon_wiki: type.Record('string', 'string'),
		avatar_wiki: type.Record('string', 'string'),
	},
});

export async function _get_hoyolab_genshin_character_ids(client: TeyvatHttpClient, uid: number, server: TeyvatServer) {
	const data = await client.request({
		domain: TEYVAT_DOMAINS.genshin_record,
		path: 'character/list',
		method: 'POST',
		body: { role_id: uid, server },
		schema: schema_hoyolab_genshin_character_list_response,
		headers: _hoyolab_headers(),
	});
	return data.list.map(({ id }) => id);
}

export async function _get_hoyolab_genshin_character_details(
	client: TeyvatHttpClient,
	uid: number,
	server: TeyvatServer,
	character_ids: number[],
) {
	return await client.request({
		domain: TEYVAT_DOMAINS.genshin_record,
		path: 'character/detail',
		method: 'POST',
		body: { role_id: uid, server, character_ids },
		schema: schema_hoyolab_genshin_character_details_response,
		headers: _hoyolab_headers(),
	});
}
