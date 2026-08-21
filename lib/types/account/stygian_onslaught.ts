import { type } from 'arktype';

const schema_metric_type = type.enumerated('unknown', 'strongest_strike', 'highest_damage');
const schema_tag_type = type.enumerated('unknown', 'advantage', 'disadvantage');
const schema_tag_element = type.enumerated('cryo', 'hydro', 'pyro', 'dendro');

const schema_best_record = type({
	difficulty: 'number.integer',
	completion_seconds: 'number.integer',
	badge_icon: 'string',
});

const schema_character = type({
	id: 'number.integer',
	name: 'string',
	element: 'string',
	icon: 'string',
	level: 'number.integer',
	rarity: 'number.integer',
	constellation: 'number.integer',
});

const schema_best_character = type({
	id: 'number.integer',
	side_icon: 'string',
	value: 'string',
	metric: schema_metric_type,
});

const schema_enemy_tag = type({
	type: schema_tag_type,
	description: 'string',
	elements: schema_tag_element.array(),
});

const schema_enemy = type({
	id: 'number.integer',
	name: 'string',
	level: 'number.integer',
	icon: 'string',
	descriptions: 'string[]',
	tags: schema_enemy_tag.array(),
});

const schema_challenge = type({
	name: 'string',
	completion_seconds: 'number.integer',
	team: schema_character.array(),
	best_characters: schema_best_character.array(),
	enemy: schema_enemy,
});

const schema_mode = type({
	has_data: 'boolean',
	best_record: schema_best_record.or('null'),
	challenges: schema_challenge.array(),
});

export const schema_teyvat_account_stygian_onslaught = type({
	schedule: {
		id: 'string',
		name: 'string',
		starts_at: 'Date',
		ends_at: 'Date',
	},
	single_player: schema_mode,
	multiplayer: schema_mode,
});

/**
 * @interface
 * @useDeclaredType
 * @category Stygian Onslaught
 */
export type TeyvatAccountStygianOnslaught = typeof schema_teyvat_account_stygian_onslaught.infer;
