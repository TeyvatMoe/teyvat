import { type } from 'arktype';

export const schemaTeyvatAccountShowcaseCharacter = type({
	id: 'number.integer > 0',
	name: 'string',
	element: type.enumerated('anemo', 'geo', 'electro', 'dendro', 'hydro', 'pyro', 'cryo'),
	rarity: 'number.integer > 0',
	icon: 'string',
	sideIcon: 'string',
	displayImage: 'string',
	level: 'number.integer >= 0',
	friendship: 'number.integer >= 0',
	activeConstellations: 'number.integer >= 0',
	weaponType: type.enumerated('sword', 'catalyst', 'claymore', 'bow', 'polearm'),
});

/**
 * @interface
 * @useDeclaredType
 * @category Character Showcase
 */
export type TeyvatAccountShowcaseCharacter = typeof schemaTeyvatAccountShowcaseCharacter.infer;
