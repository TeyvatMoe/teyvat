import { type } from 'arktype';
import { schema_teyvat_server } from './server.ts';

const schema_teyvat_account_oculi = type({
	anemo: 'number.integer',
	geo: 'number.integer',
	electro: 'number.integer',
	dendro: 'number.integer',
	hydro: 'number.integer',
	pyro: 'number.integer',
	lunar: 'number.integer',
});

const schema_teyvat_account_chests = type({
	common: 'number.integer',
	exquisite: 'number.integer',
	precious: 'number.integer',
	luxurious: 'number.integer',
	remarkable: 'number.integer',
});

const schema_teyvat_account_imaginarium_theater = type({
	unlocked: 'boolean',
	max_act: 'number.integer',
	has_data: 'boolean',
	has_detail_data: 'boolean',
});

const schema_teyvat_account_stygian_onslaught = type({
	unlocked: 'boolean',
	difficulty: 'number.integer',
	name: 'string',
	has_data: 'boolean',
});

const schema_teyvat_account_stats = type({
	achievements: 'number.integer',
	active_days: 'number.integer',
	characters: 'number.integer',
	spiral_abyss: 'string',
	oculi: schema_teyvat_account_oculi,
	chests: schema_teyvat_account_chests,
	unlocked_waypoints: 'number.integer',
	unlocked_domains: 'number.integer',
	max_friendship_characters: 'number.integer',
	imaginarium_theater: schema_teyvat_account_imaginarium_theater,
	stygian_onslaught: schema_teyvat_account_stygian_onslaught,
});

const schema_teyvat_exploration_visuals = type({
	icon: 'string',
	inner_icon: 'string',
	background_image: 'string',
	cover: 'string',
	map_url: 'string',
});

const schema_teyvat_exploration_offering = type({
	name: 'string',
	level: 'number.integer',
	icon: 'string',
});

const schema_teyvat_exploration_area = type({
	name: 'string',
	explored: 'number >= 0',
});

const schema_teyvat_exploration_boss = type({
	name: 'string',
	kills: 'number.integer',
});

const schema_teyvat_exploration_natlan_tribe = type({
	id: 'number.integer',
	name: 'string',
	level: 'number.integer',
	icon: 'string',
	image: 'string',
});

const schema_teyvat_account_exploration = type({
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

const schema_teyvat_teapot_realm = type({
	name: 'string',
	icon: 'string',
});

const schema_teyvat_account_teapot = type({
	level: 'number.integer',
	visitors: 'number.integer',
	furnishings: 'number.integer',
	adeptal_energy: {
		value: 'number.integer',
		name: 'string',
		icon: 'string',
	},
	realms: schema_teyvat_teapot_realm.array(),
});

export const schema_teyvat_account_info = type({
	uid: 'number.integer',
	nickname: 'string',
	pfp: 'string',
	server: schema_teyvat_server,
	level: 'number.integer',
	stats: schema_teyvat_account_stats,
	explorations: schema_teyvat_account_exploration.array(),
	teapot: schema_teyvat_account_teapot.or('null'),
});

/** @category Account Info */
export interface TeyvatAccountInfoOptions {
	auto_enable?: boolean;
}

/**
 * @interface
 * @useDeclaredType
 * @category Account Info
 */
export type TeyvatAccountInfo = typeof schema_teyvat_account_info.infer;
