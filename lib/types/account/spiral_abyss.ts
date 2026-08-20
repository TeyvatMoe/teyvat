import { type } from 'arktype';

const schema_teyvat_spiral_abyss_period = type.enumerated('current', 'previous');
/**
 * @useDeclaredType
 * @category Spiral Abyss
 */
export type TeyvatSpiralAbyssPeriod = typeof schema_teyvat_spiral_abyss_period.infer;

export interface TeyvatSpiralAbyssOptions {
	period?: TeyvatSpiralAbyssPeriod;
}

const schema_teyvat_spiral_abyss_half = type.enumerated('first', 'second');
/**
 * @useDeclaredType
 * @category Spiral Abyss
 */
export type TeyvatSpiralAbyssHalf = typeof schema_teyvat_spiral_abyss_half.infer;

const schema_teyvat_spiral_abyss_ranked_character = type({
	id: 'number.integer',
	icon: 'string',
	rarity: 'number.integer',
	value: 'number.integer',
});
/**
 * @interface
 * @useDeclaredType
 * @category Spiral Abyss
 */
export type TeyvatSpiralAbyssRankedCharacter = typeof schema_teyvat_spiral_abyss_ranked_character.infer;

const schema_teyvat_spiral_abyss_ranks = type({
	most_played: schema_teyvat_spiral_abyss_ranked_character.array(),
	most_kills: schema_teyvat_spiral_abyss_ranked_character.array(),
	strongest_strike: schema_teyvat_spiral_abyss_ranked_character.array(),
	most_damage_taken: schema_teyvat_spiral_abyss_ranked_character.array(),
	most_skills_used: schema_teyvat_spiral_abyss_ranked_character.array(),
	most_bursts_used: schema_teyvat_spiral_abyss_ranked_character.array(),
});
/**
 * @interface
 * @useDeclaredType
 * @category Spiral Abyss
 */
export type TeyvatSpiralAbyssRanks = typeof schema_teyvat_spiral_abyss_ranks.infer;

const schema_teyvat_spiral_abyss_character = type({
	id: 'number.integer',
	icon: 'string',
	rarity: 'number.integer',
	level: 'number.integer',
});
/**
 * @interface
 * @useDeclaredType
 * @category Spiral Abyss
 */
export type TeyvatSpiralAbyssCharacter = typeof schema_teyvat_spiral_abyss_character.infer;

const schema_teyvat_spiral_abyss_enemy = type({
	name: 'string',
	icon: 'string',
	level: 'number.integer',
});
/**
 * @interface
 * @useDeclaredType
 * @category Spiral Abyss
 */
export type TeyvatSpiralAbyssEnemy = typeof schema_teyvat_spiral_abyss_enemy.infer;

const schema_teyvat_spiral_abyss_battle = type({
	half: schema_teyvat_spiral_abyss_half,
	completed_at: 'Date',
	characters: schema_teyvat_spiral_abyss_character.array(),
});
/**
 * @interface
 * @useDeclaredType
 * @category Spiral Abyss
 */
export type TeyvatSpiralAbyssBattle = typeof schema_teyvat_spiral_abyss_battle.infer;

const schema_teyvat_spiral_abyss_chamber = type({
	number: 'number.integer',
	stars: 'number.integer',
	maximum_stars: 'number.integer',
	battles: schema_teyvat_spiral_abyss_battle.array(),
	enemies: {
		first_half: schema_teyvat_spiral_abyss_enemy.array(),
		second_half: schema_teyvat_spiral_abyss_enemy.array(),
	},
});
/**
 * @interface
 * @useDeclaredType
 * @category Spiral Abyss
 */
export type TeyvatSpiralAbyssChamber = typeof schema_teyvat_spiral_abyss_chamber.infer;

const schema_teyvat_spiral_abyss_floor = type({
	number: 'number.integer',
	unlocked: 'boolean',
	stars: 'number.integer',
	maximum_stars: 'number.integer',
	chambers: schema_teyvat_spiral_abyss_chamber.array(),
});
/**
 * @interface
 * @useDeclaredType
 * @category Spiral Abyss
 */
export type TeyvatSpiralAbyssFloor = typeof schema_teyvat_spiral_abyss_floor.infer;

export const schema_teyvat_account_spiral_abyss = type({
	unlocked: 'boolean',
	season: 'number.integer',
	starts_at: 'Date',
	ends_at: 'Date',
	total_battles: 'number.integer',
	total_wins: 'number.integer',
	deepest_floor: 'string',
	total_stars: 'number.integer',
	floor_skipping: {
		occurred: 'boolean',
		destination: 'string',
	},
	ranks: schema_teyvat_spiral_abyss_ranks,
	floors: schema_teyvat_spiral_abyss_floor.array(),
});
/**
 * @interface
 * @useDeclaredType
 * @category Spiral Abyss
 */
export type TeyvatAccountSpiralAbyss = typeof schema_teyvat_account_spiral_abyss.infer;
