import { type } from 'arktype';

/** @category Characters */
export interface TeyvatCharactersOptions {
	ids?: number[];
	update?: boolean;
}

const schemaTeyvatCharacterElement = type.enumerated('anemo', 'geo', 'electro', 'dendro', 'hydro', 'pyro', 'cryo');
/**
 * @useDeclaredType
 * @category Characters
 */
export type TeyvatCharacterElement = typeof schemaTeyvatCharacterElement.infer;

const schemaTeyvatWeaponType = type.enumerated('sword', 'catalyst', 'claymore', 'bow', 'polearm');
/**
 * @useDeclaredType
 * @category Characters
 */
export type TeyvatWeaponType = typeof schemaTeyvatWeaponType.infer;

const schemaTeyvatPropertyInfo = type({
	type: 'number.integer',
	name: 'string',
	icon: 'string | null',
	filterName: 'string',
});
const schemaTeyvatPropertyValue = type({
	base: 'string',
	add: 'string',
	final: 'string',
	info: schemaTeyvatPropertyInfo,
});
const schemaTeyvatCharacterWeapon = type({
	id: 'number.integer',
	name: 'string',
	icon: 'string',
	rarity: 'number.integer',
	level: 'number.integer',
	refinement: 'number.integer',
	ascension: 'number.integer',
	description: 'string',
	mainStat: schemaTeyvatPropertyValue,
	subStat: schemaTeyvatPropertyValue.or('null'),
	wikiUrl: 'string | null',
});
const schemaTeyvatArtifactStat = type({
	value: 'string',
	times: 'number.integer',
	info: schemaTeyvatPropertyInfo,
});
const schemaTeyvatArtifactSetEffect = type({
	requiredPieces: 'number.integer',
	effect: 'string',
	active: 'boolean',
});
const schemaTeyvatArtifactSet = type({
	id: 'number.integer',
	name: 'string',
	effects: schemaTeyvatArtifactSetEffect.array(),
});
const schemaTeyvatCharacterArtifact = type({
	id: 'number.integer',
	name: 'string',
	icon: 'string',
	position: 'number.integer',
	positionName: 'string',
	rarity: 'number.integer',
	level: 'number.integer',
	set: schemaTeyvatArtifactSet,
	mainStat: schemaTeyvatArtifactStat,
	subStats: schemaTeyvatArtifactStat.array(),
	wikiUrl: 'string | null',
});
const schemaTeyvatCharacterConstellation = type({
	id: 'number.integer',
	name: 'string',
	icon: 'string',
	position: 'number.integer',
	effect: 'string',
	activated: 'boolean',
	enhanced: 'boolean',
	enhancedEffect: 'string',
	canBeEnhanced: 'boolean',
});
const schemaTeyvatCharacterCostume = type({ id: 'number.integer', name: 'string', icon: 'string' });

const schemaTeyvatCharacterSkillAffix = type({ name: 'string', value: 'string' });

const schemaTeyvatCharacterSkill = type({
	id: 'number.integer',
	type: 'number.integer',
	name: 'string',
	level: 'number.integer',
	description: 'string',
	affixes: schemaTeyvatCharacterSkillAffix.array(),
	icon: 'string',
	unlocked: 'boolean',
	enhanced: 'boolean',
	enhancedDescription: 'string',
	canBeEnhanced: 'boolean',
});
export const schemaTeyvatAccountCharacter = type({
	id: 'number.integer',
	name: 'string',
	element: schemaTeyvatCharacterElement,
	rarity: 'number.integer',
	collab: 'boolean',
	icon: 'string',
	sideIcon: 'string',
	displayImage: 'string',
	level: 'number.integer',
	ascension: 'number.integer >= 0',
	friendship: 'number.integer',
	activeConstellations: 'number.integer',
	selected: 'boolean',
	weaponType: schemaTeyvatWeaponType,
	weapon: schemaTeyvatCharacterWeapon,
	costumes: schemaTeyvatCharacterCostume.array(),
	artifacts: schemaTeyvatCharacterArtifact.array(),
	constellations: schemaTeyvatCharacterConstellation.array(),
	skills: schemaTeyvatCharacterSkill.array(),
	baseProperties: schemaTeyvatPropertyValue.array(),
	selectedProperties: schemaTeyvatPropertyValue.array(),
	extraProperties: schemaTeyvatPropertyValue.array(),
	elementProperties: schemaTeyvatPropertyValue.array(),
	wikiUrl: 'string | null',
});
/**
 * @interface
 * @useDeclaredType
 * @category Characters
 */
export type TeyvatAccountCharacter = typeof schemaTeyvatAccountCharacter.infer;
