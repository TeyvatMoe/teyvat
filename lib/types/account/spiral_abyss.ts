import { type } from 'arktype';

const schemaTeyvatSpiralAbyssPeriod = type.enumerated('current', 'previous');
/**
 * @useDeclaredType
 * @category Spiral Abyss
 */
export type TeyvatSpiralAbyssPeriod = typeof schemaTeyvatSpiralAbyssPeriod.infer;

export interface TeyvatSpiralAbyssOptions {
	period?: TeyvatSpiralAbyssPeriod;
}

const schemaTeyvatSpiralAbyssHalf = type.enumerated('first', 'second');
/**
 * @useDeclaredType
 * @category Spiral Abyss
 */
export type TeyvatSpiralAbyssHalf = typeof schemaTeyvatSpiralAbyssHalf.infer;

const schemaTeyvatSpiralAbyssRankedCharacter = type({
	id: 'number.integer',
	icon: 'string',
	rarity: 'number.integer',
	value: 'number.integer',
});
const schemaTeyvatSpiralAbyssRanks = type({
	mostPlayed: schemaTeyvatSpiralAbyssRankedCharacter.array(),
	mostKills: schemaTeyvatSpiralAbyssRankedCharacter.array(),
	strongestStrike: schemaTeyvatSpiralAbyssRankedCharacter.array(),
	mostDamageTaken: schemaTeyvatSpiralAbyssRankedCharacter.array(),
	mostSkillsUsed: schemaTeyvatSpiralAbyssRankedCharacter.array(),
	mostBurstsUsed: schemaTeyvatSpiralAbyssRankedCharacter.array(),
});
const schemaTeyvatSpiralAbyssCharacter = type({
	id: 'number.integer',
	icon: 'string',
	rarity: 'number.integer',
	level: 'number.integer',
});
const schemaTeyvatSpiralAbyssEnemy = type({
	name: 'string',
	icon: 'string',
	level: 'number.integer',
});
const schemaTeyvatSpiralAbyssBattle = type({
	half: schemaTeyvatSpiralAbyssHalf,
	completedAt: 'Date',
	characters: schemaTeyvatSpiralAbyssCharacter.array(),
});
const schemaTeyvatSpiralAbyssChamber = type({
	number: 'number.integer',
	stars: 'number.integer',
	maximumStars: 'number.integer',
	battles: schemaTeyvatSpiralAbyssBattle.array(),
	enemies: {
		firstHalf: schemaTeyvatSpiralAbyssEnemy.array(),
		secondHalf: schemaTeyvatSpiralAbyssEnemy.array(),
	},
});
const schemaTeyvatSpiralAbyssFloor = type({
	number: 'number.integer',
	unlocked: 'boolean',
	stars: 'number.integer',
	maximumStars: 'number.integer',
	chambers: schemaTeyvatSpiralAbyssChamber.array(),
});
export const schemaTeyvatAccountSpiralAbyss = type({
	unlocked: 'boolean',
	season: 'number.integer',
	startsAt: 'Date',
	endsAt: 'Date',
	totalBattles: 'number.integer',
	totalWins: 'number.integer',
	deepestFloor: 'string',
	totalStars: 'number.integer',
	floorSkipping: {
		occurred: 'boolean',
		destination: 'string',
	},
	ranks: schemaTeyvatSpiralAbyssRanks,
	floors: schemaTeyvatSpiralAbyssFloor.array(),
});
/**
 * @interface
 * @useDeclaredType
 * @category Spiral Abyss
 */
export type TeyvatAccountSpiralAbyss = typeof schemaTeyvatAccountSpiralAbyss.infer;
