import { type } from 'arktype';

const schema_status = type.enumerated('unknown', 'upcoming', 'active', 'finished');
/**
 * @useDeclaredType
 * @category Event Calendar
 */
export type TeyvatCalendarStatus = typeof schema_status.infer;

const schema_element = type.enumerated('unknown', 'anemo', 'geo', 'electro', 'dendro', 'hydro', 'pyro', 'cryo');
/**
 * @useDeclaredType
 * @category Event Calendar
 */
export type TeyvatCalendarElement = typeof schema_element.infer;

const schema_character = type({
	id: 'number.integer',
	name: 'string',
	icon: 'string',
	element: schema_element,
	rarity: 'number.integer',
});

const schema_weapon = type({
	id: 'number.integer',
	name: 'string',
	icon: 'string',
	rarity: 'number.integer',
	wiki_url: 'string | null',
});

const schema_banner = type({
	id: 'number.integer',
	version: 'string',
	name: 'string',
	starts_at: 'Date | null',
	ends_at: 'Date | null',
	countdown_seconds: 'number.integer >= 0',
	jump_url: 'string',
	status: schema_status,
	characters: schema_character.array(),
	weapons: schema_weapon.array(),
});

const schema_reward = type({
	id: 'number.integer',
	name: 'string',
	icon: 'string',
	amount: 'number.integer >= 0',
	rarity: 'number.integer',
	wiki_url: 'string | null',
	featured: 'boolean',
});

const schema_activity = type({
	id: 'number.integer',
	name: 'string',
	description: 'string',
	strategy: 'string',
	type: 'string',
	starts_at: 'Date | null',
	ends_at: 'Date | null',
	countdown_seconds: 'number.integer >= 0',
	status: schema_status,
	finished: 'boolean',
	rewards: schema_reward.array(),
	exploration: type({ explored: 'number', finished: 'boolean' }).or('null'),
	double_rewards: type({ total: 'number.integer >= 0', remaining: 'number.integer >= 0' }).or('null'),
	spiral_abyss: type({
		unlocked: 'boolean',
		maximum_stars: 'number.integer >= 0',
		total_stars: 'number.integer >= 0',
		has_data: 'boolean',
	}).or('null'),
	imaginarium_theater: type({
		unlocked: 'boolean',
		maximum_act: 'number.integer >= 0',
		has_data: 'boolean',
	}).or('null'),
});

export const schema_teyvat_account_calendar = type({
	banners: {
		characters: schema_banner.array(),
		weapons: schema_banner.array(),
		chronicled: schema_banner.array(),
	},
	activities: {
		events: schema_activity.array(),
		challenges: schema_activity.array(),
	},
});

/**
 * @interface
 * @useDeclaredType
 * @category Event Calendar
 */
export type TeyvatAccountCalendar = typeof schema_teyvat_account_calendar.infer;
