import { type } from 'arktype';
import type { TeyvatCharacterElement } from './character.ts';

const schema_calculator_character = type({
	id: 'number.integer > 0',
	name: 'string',
	icon: 'string',
	rarity: 'number.integer >= 0',
	element: type.enumerated('anemo', 'geo', 'electro', 'dendro', 'hydro', 'pyro', 'cryo'),
	weapon_type: type.enumerated('sword', 'catalyst', 'claymore', 'bow', 'polearm'),
	current_level: 'number.integer >= 0',
	maximum_level: 'number.integer >= 0',
});

export const schema_teyvat_calculator_characters = schema_calculator_character.array();

const schema_calculator_weapon = type({
	id: 'number.integer > 0',
	name: 'string',
	icon: 'string',
	rarity: 'number.integer >= 0',
	type: type.enumerated('sword', 'catalyst', 'claymore', 'bow', 'polearm'),
	current_level: 'number.integer >= 0',
	maximum_level: 'number.integer >= 0',
});

const schema_calculator_talent = type({
	id: 'number.integer > 0',
	name: 'string',
	icon: 'string',
	current_level: 'number.integer >= 0',
	maximum_level: 'number.integer >= 0',
});

const schema_calculator_artifact = type({
	id: 'number.integer > 0',
	name: 'string',
	icon: 'string',
	rarity: 'number.integer >= 0',
	position: 'number.integer >= 0',
	current_level: 'number.integer >= 0',
	maximum_level: 'number.integer >= 0',
});

export const schema_teyvat_calculator_character_details = type({
	weapon: schema_calculator_weapon,
	talents: schema_calculator_talent.array(),
	artifacts: schema_calculator_artifact.array(),
});

const schema_calculator_material = type({
	id: 'number.integer > 0',
	name: 'string',
	icon: 'string',
	rarity: 'number.integer >= 0',
	wiki_url: 'string | null',
	required: 'number.integer >= 0',
	owned: 'number.integer >= 0',
	missing: 'number.integer >= 0',
});

const schema_calculator_talent_result = type({
	id: 'number.integer > 0',
	current_level: 'number.integer >= 0',
	target_level: 'number.integer >= 0',
	materials: schema_calculator_material.array(),
});

const schema_calculator_artifact_result = type({
	id: 'number.integer > 0',
	materials: schema_calculator_material.array(),
});

export const schema_teyvat_calculator_result = type({
	character: schema_calculator_material.array(),
	weapon: schema_calculator_material.array(),
	talents: schema_calculator_talent_result.array(),
	artifacts: schema_calculator_artifact_result.array(),
	total: schema_calculator_material.array(),
	lineup_recommendation: 'string | null',
});

export interface TeyvatCalculatorOptions {
	character: {
		id: number;
		current_level: number;
		target_level: number;
		element?: TeyvatCharacterElement;
	};
	weapon?: { id: number; current_level: number; target_level: number };
	talents?: Array<{ id: number; current_level: number; target_level: number }>;
	artifacts?: Array<{ id: number; current_level: number; target_level: number }>;
}

/**
 * @interface
 * @useDeclaredType
 * @category Enhancement Calculator
 */
export type TeyvatCalculatorCharacter = (typeof schema_teyvat_calculator_characters.infer)[number];

/**
 * @interface
 * @useDeclaredType
 * @category Enhancement Calculator
 */
export type TeyvatCalculatorCharacterDetails = typeof schema_teyvat_calculator_character_details.infer;

/**
 * @interface
 * @useDeclaredType
 * @category Enhancement Calculator
 */
export type TeyvatCalculatorResult = typeof schema_teyvat_calculator_result.infer;

/** @category Enhancement Calculator */
export interface TeyvatCalculatorClient {
	characters(): Promise<TeyvatCalculatorCharacter[]>;
	character(id: number): Promise<TeyvatCalculatorCharacterDetails>;
	calculate(options: TeyvatCalculatorOptions): Promise<TeyvatCalculatorResult>;
}
