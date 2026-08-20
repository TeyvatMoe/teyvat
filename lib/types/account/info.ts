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

/**
 * @interface
 * @useDeclaredType
 * @category Account Info
 */
export type TeyvatAccountOculi = typeof schema_teyvat_account_oculi.infer;

const schema_teyvat_account_chests = type({
	common: 'number.integer',
	exquisite: 'number.integer',
	precious: 'number.integer',
	luxurious: 'number.integer',
	remarkable: 'number.integer',
});

/**
 * @interface
 * @useDeclaredType
 * @category Account Info
 */
export type TeyvatAccountChests = typeof schema_teyvat_account_chests.infer;

const schema_teyvat_account_imaginarium_theater = type({
	unlocked: 'boolean',
	max_act: 'number.integer',
	has_data: 'boolean',
	has_detail_data: 'boolean',
});

/**
 * @interface
 * @useDeclaredType
 * @category Account Info
 */
export type TeyvatAccountImaginariumTheater = typeof schema_teyvat_account_imaginarium_theater.infer;

const schema_teyvat_account_stygian_onslaught = type({
	unlocked: 'boolean',
	difficulty: 'number.integer',
	name: 'string',
	has_data: 'boolean',
});

/**
 * @interface
 * @useDeclaredType
 * @category Account Info
 */
export type TeyvatAccountStygianOnslaught = typeof schema_teyvat_account_stygian_onslaught.infer;

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

/**
 * @interface
 * @useDeclaredType
 * @category Account Info
 */
export type TeyvatAccountStats = typeof schema_teyvat_account_stats.infer;

export const schema_teyvat_account_info = type({
	uid: 'number.integer',
	nickname: 'string',
	pfp: 'string',
	server: schema_teyvat_server,
	level: 'number.integer',
	stats: schema_teyvat_account_stats,
});

/**
 * @interface
 * @useDeclaredType
 * @category Account Info
 */
export type TeyvatAccountInfo = typeof schema_teyvat_account_info.infer;
