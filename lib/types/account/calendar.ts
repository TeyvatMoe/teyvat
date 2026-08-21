import { type } from 'arktype';

const schemaStatus = type.enumerated('unknown', 'upcoming', 'active', 'finished');
/**
 * @useDeclaredType
 * @category Event Calendar
 */
export type TeyvatCalendarStatus = typeof schemaStatus.infer;

const schemaElement = type.enumerated('unknown', 'anemo', 'geo', 'electro', 'dendro', 'hydro', 'pyro', 'cryo');
/**
 * @useDeclaredType
 * @category Event Calendar
 */
export type TeyvatCalendarElement = typeof schemaElement.infer;

const schemaCharacter = type({
	id: 'number.integer',
	name: 'string',
	icon: 'string',
	element: schemaElement,
	rarity: 'number.integer',
});

const schemaWeapon = type({
	id: 'number.integer',
	name: 'string',
	icon: 'string',
	rarity: 'number.integer',
	wikiUrl: 'string | null',
});

const schemaBanner = type({
	id: 'number.integer',
	version: 'string',
	name: 'string',
	startsAt: 'Date | null',
	endsAt: 'Date | null',
	countdownSeconds: 'number.integer >= 0',
	jumpUrl: 'string',
	status: schemaStatus,
	characters: schemaCharacter.array(),
	weapons: schemaWeapon.array(),
});

const schemaReward = type({
	id: 'number.integer',
	name: 'string',
	icon: 'string',
	amount: 'number.integer >= 0',
	rarity: 'number.integer',
	wikiUrl: 'string | null',
	featured: 'boolean',
});

const schemaActivity = type({
	id: 'number.integer',
	name: 'string',
	description: 'string',
	strategy: 'string',
	type: 'string',
	startsAt: 'Date | null',
	endsAt: 'Date | null',
	countdownSeconds: 'number.integer >= 0',
	status: schemaStatus,
	finished: 'boolean',
	rewards: schemaReward.array(),
	exploration: type({ explored: 'number', finished: 'boolean' }).or('null'),
	doubleRewards: type({ total: 'number.integer >= 0', remaining: 'number.integer >= 0' }).or('null'),
	spiralAbyss: type({
		unlocked: 'boolean',
		maximumStars: 'number.integer >= 0',
		totalStars: 'number.integer >= 0',
		hasData: 'boolean',
	}).or('null'),
	imaginariumTheater: type({
		unlocked: 'boolean',
		maximumAct: 'number.integer >= 0',
		hasData: 'boolean',
	}).or('null'),
});

export const schemaTeyvatAccountCalendar = type({
	banners: {
		characters: schemaBanner.array(),
		weapons: schemaBanner.array(),
		chronicled: schemaBanner.array(),
	},
	activities: {
		events: schemaActivity.array(),
		challenges: schemaActivity.array(),
	},
});

/**
 * @interface
 * @useDeclaredType
 * @category Event Calendar
 */
export type TeyvatAccountCalendar = typeof schemaTeyvatAccountCalendar.infer;
