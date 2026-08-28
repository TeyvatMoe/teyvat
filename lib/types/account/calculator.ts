import { type } from 'arktype';
import type { TeyvatCharacterElement } from './character.ts';

const schemaCalculatorCharacter = type({
	id: 'number.integer > 0',
	name: 'string',
	icon: 'string',
	rarity: 'number.integer >= 0',
	element: type.enumerated('anemo', 'geo', 'electro', 'dendro', 'hydro', 'pyro', 'cryo'),
	weaponType: type.enumerated('sword', 'catalyst', 'claymore', 'bow', 'polearm'),
	currentLevel: 'number.integer >= 0',
	maximumLevel: 'number.integer >= 0',
	ascension: 'number.integer >= 0',
});

export const schemaTeyvatCalculatorCharacters = schemaCalculatorCharacter.array();

const schemaCalculatorWeapon = type({
	id: 'number.integer > 0',
	name: 'string',
	icon: 'string',
	rarity: 'number.integer >= 0',
	type: type.enumerated('sword', 'catalyst', 'claymore', 'bow', 'polearm'),
	currentLevel: 'number.integer >= 0',
	maximumLevel: 'number.integer >= 0',
});

const schemaCalculatorTalent = type({
	id: 'number.integer > 0',
	name: 'string',
	icon: 'string',
	currentLevel: 'number.integer >= 0',
	maximumLevel: 'number.integer >= 0',
});

const schemaCalculatorArtifact = type({
	id: 'number.integer > 0',
	name: 'string',
	icon: 'string',
	rarity: 'number.integer >= 0',
	position: 'number.integer >= 0',
	currentLevel: 'number.integer >= 0',
	maximumLevel: 'number.integer >= 0',
});

export const schemaTeyvatCalculatorCharacterDetails = type({
	weapon: schemaCalculatorWeapon,
	talents: schemaCalculatorTalent.array(),
	artifacts: schemaCalculatorArtifact.array(),
});

const schemaCalculatorMaterial = type({
	id: 'number.integer > 0',
	name: 'string',
	icon: 'string',
	rarity: 'number.integer >= 0',
	wikiUrl: 'string | null',
	required: 'number.integer >= 0',
	owned: 'number.integer >= 0',
	missing: 'number.integer >= 0',
});

const schemaCalculatorTalentResult = type({
	id: 'number.integer > 0',
	currentLevel: 'number.integer >= 0',
	targetLevel: 'number.integer >= 0',
	materials: schemaCalculatorMaterial.array(),
});

const schemaCalculatorArtifactResult = type({
	id: 'number.integer > 0',
	materials: schemaCalculatorMaterial.array(),
});

export const schemaTeyvatCalculatorResult = type({
	character: schemaCalculatorMaterial.array(),
	weapon: schemaCalculatorMaterial.array(),
	talents: schemaCalculatorTalentResult.array(),
	artifacts: schemaCalculatorArtifactResult.array(),
	total: schemaCalculatorMaterial.array(),
	lineupRecommendation: 'string | null',
});

/** @category Enhancement Calculator */
export interface TeyvatCalculatorOptions {
	character: {
		id: number;
		currentLevel: number;
		targetLevel: number;
		element?: TeyvatCharacterElement;
	};
	weapon?: { id: number; currentLevel: number; targetLevel: number };
	talents?: Array<{ id: number; currentLevel: number; targetLevel: number }>;
	artifacts?: Array<{ id: number; currentLevel: number; targetLevel: number }>;
}

/** @category Enhancement Calculator */
export interface TeyvatCalculatorCharactersOptions {
	update?: boolean;
}

/**
 * @interface
 * @useDeclaredType
 * @category Enhancement Calculator
 */
export type TeyvatCalculatorCharacter = (typeof schemaTeyvatCalculatorCharacters.infer)[number];

/**
 * @interface
 * @useDeclaredType
 * @category Enhancement Calculator
 */
export type TeyvatCalculatorCharacterDetails = typeof schemaTeyvatCalculatorCharacterDetails.infer;

/**
 * @interface
 * @useDeclaredType
 * @category Enhancement Calculator
 */
export type TeyvatCalculatorResult = typeof schemaTeyvatCalculatorResult.infer;

/** @category Enhancement Calculator */
export interface TeyvatCalculatorClient {
	characters(options?: TeyvatCalculatorCharactersOptions): Promise<TeyvatCalculatorCharacter[]>;
	character(id: number): Promise<TeyvatCalculatorCharacterDetails>;
	calculate(options: TeyvatCalculatorOptions): Promise<TeyvatCalculatorResult>;
}
