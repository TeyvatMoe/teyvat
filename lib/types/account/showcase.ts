import { type } from 'arktype';

export const schema_teyvat_account_showcase_character = type({
	id: 'number.integer > 0',
	name: 'string',
	element: type.enumerated('anemo', 'geo', 'electro', 'dendro', 'hydro', 'pyro', 'cryo'),
	rarity: 'number.integer > 0',
	icon: 'string',
	side_icon: 'string',
	display_image: 'string',
	level: 'number.integer >= 0',
	friendship: 'number.integer >= 0',
	active_constellations: 'number.integer >= 0',
	weapon_type: type.enumerated('sword', 'catalyst', 'claymore', 'bow', 'polearm'),
});

/**
 * @interface
 * @useDeclaredType
 * @category Character Showcase
 */
export type TeyvatAccountShowcaseCharacter = typeof schema_teyvat_account_showcase_character.infer;
