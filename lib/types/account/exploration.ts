import { type } from 'arktype';

export interface TeyvatExplorationOptions {
	auto_enable?: boolean;
}

const schema_teyvat_exploration_visuals = type({
	icon: 'string',
	inner_icon: 'string',
	background_image: 'string',
	cover: 'string',
	map_url: 'string',
});

/**
 * @interface
 * @useDeclaredType
 * @category Exploration
 */
export type TeyvatExplorationVisuals = typeof schema_teyvat_exploration_visuals.infer;

const schema_teyvat_exploration_offering = type({
	name: 'string',
	level: 'number.integer',
	icon: 'string',
});

/**
 * @interface
 * @useDeclaredType
 * @category Exploration
 */
export type TeyvatExplorationOffering = typeof schema_teyvat_exploration_offering.infer;

const schema_teyvat_exploration_area = type({
	name: 'string',
	explored: 'number >= 0',
});

/**
 * @interface
 * @useDeclaredType
 * @category Exploration
 */
export type TeyvatExplorationArea = typeof schema_teyvat_exploration_area.infer;

const schema_teyvat_exploration_boss = type({
	name: 'string',
	kills: 'number.integer',
});

/**
 * @interface
 * @useDeclaredType
 * @category Exploration
 */
export type TeyvatExplorationBoss = typeof schema_teyvat_exploration_boss.infer;

const schema_teyvat_exploration_natlan_tribe = type({
	id: 'number.integer',
	name: 'string',
	level: 'number.integer',
	icon: 'string',
	image: 'string',
});

/**
 * @interface
 * @useDeclaredType
 * @category Exploration
 */
export type TeyvatExplorationNatlanTribe = typeof schema_teyvat_exploration_natlan_tribe.infer;

export const schema_teyvat_account_exploration = type({
	id: 'number.integer',
	parent_id: 'number.integer',
	name: 'string',
	explored: 'number >= 0',
	visuals: schema_teyvat_exploration_visuals,
	offerings: schema_teyvat_exploration_offering.array(),
	areas: schema_teyvat_exploration_area.array(),
	bosses: schema_teyvat_exploration_boss.array(),
	natlan_tribes: schema_teyvat_exploration_natlan_tribe.array(),
});

/**
 * @interface
 * @useDeclaredType
 * @category Exploration
 */
export type TeyvatAccountExploration = typeof schema_teyvat_account_exploration.infer;
