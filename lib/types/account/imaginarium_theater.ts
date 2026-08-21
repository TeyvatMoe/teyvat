import { type } from 'arktype';

const schemaTeyvatImaginariumTheaterDifficulty = type.enumerated(
	'unknown',
	'easy',
	'normal',
	'hard',
	'visionary',
	'arcana',
);
/**
 * @useDeclaredType
 * @category Imaginarium Theater
 */
export type TeyvatImaginariumTheaterDifficulty = typeof schemaTeyvatImaginariumTheaterDifficulty.infer;

const schemaTeyvatImaginariumTheaterCharacterRole = type.enumerated('unknown', 'normal', 'trial', 'support');
/**
 * @useDeclaredType
 * @category Imaginarium Theater
 */
export type TeyvatImaginariumTheaterCharacterRole = typeof schemaTeyvatImaginariumTheaterCharacterRole.infer;

const schemaCharacter = type({
	id: 'number.integer',
	icon: 'string',
	rarity: 'number.integer',
	level: 'number.integer | null',
	role: schemaTeyvatImaginariumTheaterCharacterRole,
});

const schemaBuff = type({
	id: 'number.integer',
	icon: 'string',
	name: 'string',
	description: 'string',
	receivedAudienceSupport: 'boolean',
});

const schemaRankedCharacter = type({
	id: 'number.integer',
	icon: 'string',
	rarity: 'number.integer',
	value: 'number.integer',
});

const schemaBattleStatistics = type({
	mostDefeats: schemaRankedCharacter.or('null'),
	strongestStrike: schemaRankedCharacter.or('null'),
	mostDamageTaken: schemaRankedCharacter.or('null'),
	fastestCasts: schemaRankedCharacter.array(),
	totalCastSeconds: 'number.integer',
});

const schemaAct = type({
	number: 'number.integer',
	completedAt: 'Date',
	medalObtained: 'boolean',
	arcana: {
		active: 'boolean',
		number: 'number.integer | null',
	},
	characters: schemaCharacter.array(),
	mysteryCaches: schemaBuff.array(),
	wondrousBooms: schemaBuff.array(),
});

const schemaSeason = type({
	hasData: 'boolean',
	hasDetailData: 'boolean',
	schedule: {
		id: 'number.integer',
		type: 'number.integer',
		startsAt: 'Date',
		endsAt: 'Date',
	},
	statistics: {
		difficulty: schemaTeyvatImaginariumTheaterDifficulty,
		bestAct: 'number.integer',
		heraldry: 'number.integer',
		starChallenges: 'boolean[]',
		fantasiaFlowersUsed: 'number.integer',
		audienceSupportTriggers: 'number.integer',
		supportCharactersShared: 'number.integer',
		medals: 'number.integer',
	},
	acts: schemaAct.array(),
	backupCharacters: schemaCharacter.array(),
	battleStatistics: schemaBattleStatistics.or('null'),
});

export const schemaTeyvatAccountImaginariumTheater = type({
	unlocked: 'boolean',
	seasons: schemaSeason.array(),
});

/**
 * @interface
 * @useDeclaredType
 * @category Imaginarium Theater
 */
export type TeyvatAccountImaginariumTheater = typeof schemaTeyvatAccountImaginariumTheater.infer;
