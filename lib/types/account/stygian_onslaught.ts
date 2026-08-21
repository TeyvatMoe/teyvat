import { type } from 'arktype';

const schemaMetricType = type.enumerated('unknown', 'strongest_strike', 'highest_damage');
const schemaTagType = type.enumerated('unknown', 'advantage', 'disadvantage');
const schemaTagElement = type.enumerated('cryo', 'hydro', 'pyro', 'dendro');

const schemaBestRecord = type({
	difficulty: 'number.integer',
	completionSeconds: 'number.integer',
	badgeIcon: 'string',
});

const schemaCharacter = type({
	id: 'number.integer',
	name: 'string',
	element: 'string',
	icon: 'string',
	level: 'number.integer',
	rarity: 'number.integer',
	constellation: 'number.integer',
});

const schemaBestCharacter = type({
	id: 'number.integer',
	sideIcon: 'string',
	value: 'string',
	metric: schemaMetricType,
});

const schemaEnemyTag = type({
	type: schemaTagType,
	description: 'string',
	elements: schemaTagElement.array(),
});

const schemaEnemy = type({
	id: 'number.integer',
	name: 'string',
	level: 'number.integer',
	icon: 'string',
	descriptions: 'string[]',
	tags: schemaEnemyTag.array(),
});

const schemaChallenge = type({
	name: 'string',
	completionSeconds: 'number.integer',
	team: schemaCharacter.array(),
	bestCharacters: schemaBestCharacter.array(),
	enemy: schemaEnemy,
});

const schemaMode = type({
	hasData: 'boolean',
	bestRecord: schemaBestRecord.or('null'),
	challenges: schemaChallenge.array(),
});

export const schemaTeyvatAccountStygianOnslaught = type({
	schedule: {
		id: 'string',
		name: 'string',
		startsAt: 'Date',
		endsAt: 'Date',
	},
	singlePlayer: schemaMode,
	multiplayer: schemaMode,
});

/**
 * @interface
 * @useDeclaredType
 * @category Stygian Onslaught
 */
export type TeyvatAccountStygianOnslaught = typeof schemaTeyvatAccountStygianOnslaught.infer;
