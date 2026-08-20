import { type } from 'arktype';

export interface TeyvatCharactersOptions {
	ids?: number[];
	auto_enable?: boolean;
}

const schema_teyvat_character_element = type.enumerated('anemo', 'geo', 'electro', 'dendro', 'hydro', 'pyro', 'cryo');
/**
 * @useDeclaredType
 * @category Characters
 */
export type TeyvatCharacterElement = typeof schema_teyvat_character_element.infer;

const schema_teyvat_weapon_type = type.enumerated('sword', 'catalyst', 'claymore', 'bow', 'polearm');
/**
 * @useDeclaredType
 * @category Characters
 */
export type TeyvatWeaponType = typeof schema_teyvat_weapon_type.infer;

const schema_teyvat_property_info = type({
	type: 'number.integer',
	name: 'string',
	icon: 'string | null',
	filter_name: 'string',
});
const schema_teyvat_property_value = type({
	base: 'string',
	add: 'string',
	final: 'string',
	info: schema_teyvat_property_info,
});
const schema_teyvat_character_weapon = type({
	id: 'number.integer',
	name: 'string',
	icon: 'string',
	rarity: 'number.integer',
	level: 'number.integer',
	refinement: 'number.integer',
	ascension: 'number.integer',
	description: 'string',
	main_stat: schema_teyvat_property_value,
	sub_stat: schema_teyvat_property_value.or('null'),
	wiki_url: 'string | null',
});
const schema_teyvat_artifact_stat = type({
	value: 'string',
	times: 'number.integer',
	info: schema_teyvat_property_info,
});
const schema_teyvat_artifact_set_effect = type({
	required_pieces: 'number.integer',
	effect: 'string',
	active: 'boolean',
});
const schema_teyvat_artifact_set = type({
	id: 'number.integer',
	name: 'string',
	effects: schema_teyvat_artifact_set_effect.array(),
});
const schema_teyvat_character_artifact = type({
	id: 'number.integer',
	name: 'string',
	icon: 'string',
	position: 'number.integer',
	position_name: 'string',
	rarity: 'number.integer',
	level: 'number.integer',
	set: schema_teyvat_artifact_set,
	main_stat: schema_teyvat_artifact_stat,
	sub_stats: schema_teyvat_artifact_stat.array(),
	wiki_url: 'string | null',
});
const schema_teyvat_character_constellation = type({
	id: 'number.integer',
	name: 'string',
	icon: 'string',
	position: 'number.integer',
	effect: 'string',
	activated: 'boolean',
	enhanced: 'boolean',
	enhanced_effect: 'string',
	can_be_enhanced: 'boolean',
});
const schema_teyvat_character_costume = type({ id: 'number.integer', name: 'string', icon: 'string' });

const schema_teyvat_character_skill_affix = type({ name: 'string', value: 'string' });

const schema_teyvat_character_skill = type({
	id: 'number.integer',
	type: 'number.integer',
	name: 'string',
	level: 'number.integer',
	description: 'string',
	affixes: schema_teyvat_character_skill_affix.array(),
	icon: 'string',
	unlocked: 'boolean',
	enhanced: 'boolean',
	enhanced_description: 'string',
	can_be_enhanced: 'boolean',
});
export const schema_teyvat_account_character = type({
	id: 'number.integer',
	name: 'string',
	element: schema_teyvat_character_element,
	rarity: 'number.integer',
	collab: 'boolean',
	icon: 'string',
	side_icon: 'string',
	display_image: 'string',
	level: 'number.integer',
	friendship: 'number.integer',
	active_constellations: 'number.integer',
	selected: 'boolean',
	weapon_type: schema_teyvat_weapon_type,
	weapon: schema_teyvat_character_weapon,
	costumes: schema_teyvat_character_costume.array(),
	artifacts: schema_teyvat_character_artifact.array(),
	constellations: schema_teyvat_character_constellation.array(),
	skills: schema_teyvat_character_skill.array(),
	base_properties: schema_teyvat_property_value.array(),
	selected_properties: schema_teyvat_property_value.array(),
	extra_properties: schema_teyvat_property_value.array(),
	element_properties: schema_teyvat_property_value.array(),
	wiki_url: 'string | null',
});
/**
 * @interface
 * @useDeclaredType
 * @category Characters
 */
export type TeyvatAccountCharacter = typeof schema_teyvat_account_character.infer;
