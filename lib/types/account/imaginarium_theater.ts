import { type } from 'arktype';

const schema_teyvat_imaginarium_theater_difficulty = type.enumerated(
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
export type TeyvatImaginariumTheaterDifficulty = typeof schema_teyvat_imaginarium_theater_difficulty.infer;

const schema_teyvat_imaginarium_theater_character_role = type.enumerated('unknown', 'normal', 'trial', 'support');
/**
 * @useDeclaredType
 * @category Imaginarium Theater
 */
export type TeyvatImaginariumTheaterCharacterRole = typeof schema_teyvat_imaginarium_theater_character_role.infer;

const schema_character = type({
	id: 'number.integer',
	icon: 'string',
	rarity: 'number.integer',
	level: 'number.integer | null',
	role: schema_teyvat_imaginarium_theater_character_role,
});

const schema_buff = type({
	id: 'number.integer',
	icon: 'string',
	name: 'string',
	description: 'string',
	received_audience_support: 'boolean',
});

const schema_ranked_character = type({
	id: 'number.integer',
	icon: 'string',
	rarity: 'number.integer',
	value: 'number.integer',
});

const schema_battle_statistics = type({
	most_defeats: schema_ranked_character.or('null'),
	strongest_strike: schema_ranked_character.or('null'),
	most_damage_taken: schema_ranked_character.or('null'),
	fastest_casts: schema_ranked_character.array(),
	total_cast_seconds: 'number.integer',
});

const schema_act = type({
	number: 'number.integer',
	completed_at: 'Date',
	medal_obtained: 'boolean',
	arcana: {
		active: 'boolean',
		number: 'number.integer | null',
	},
	characters: schema_character.array(),
	mystery_caches: schema_buff.array(),
	wondrous_booms: schema_buff.array(),
});

const schema_season = type({
	has_data: 'boolean',
	has_detail_data: 'boolean',
	schedule: {
		id: 'number.integer',
		type: 'number.integer',
		starts_at: 'Date',
		ends_at: 'Date',
	},
	statistics: {
		difficulty: schema_teyvat_imaginarium_theater_difficulty,
		best_act: 'number.integer',
		heraldry: 'number.integer',
		star_challenges: 'boolean[]',
		fantasia_flowers_used: 'number.integer',
		audience_support_triggers: 'number.integer',
		support_characters_shared: 'number.integer',
		medals: 'number.integer',
	},
	acts: schema_act.array(),
	backup_characters: schema_character.array(),
	battle_statistics: schema_battle_statistics.or('null'),
});

export const schema_teyvat_account_imaginarium_theater = type({
	unlocked: 'boolean',
	seasons: schema_season.array(),
});

/**
 * @interface
 * @useDeclaredType
 * @category Imaginarium Theater
 */
export type TeyvatAccountImaginariumTheater = typeof schema_teyvat_account_imaginarium_theater.infer;
