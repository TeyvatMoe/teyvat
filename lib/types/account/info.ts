import { type } from 'arktype';
import { schema_teyvat_server } from './server.ts';

export const schema_teyvat_account_oculi = type({
	anemo: 'number.integer',
	geo: 'number.integer',
	electro: 'number.integer',
	dendro: 'number.integer',
	hydro: 'number.integer',
	pyro: 'number.integer',
	lunar: 'number.integer',
});

export type TeyvatAccountOculi = typeof schema_teyvat_account_oculi.infer;

export const schema_teyvat_account_chests = type({
	common: 'number.integer',
	exquisite: 'number.integer',
	precious: 'number.integer',
	luxurious: 'number.integer',
	remarkable: 'number.integer',
});

export type TeyvatAccountChests = typeof schema_teyvat_account_chests.infer;

export const schema_teyvat_account_imaginarium_theater = type({
	unlocked: 'boolean',
	maxAct: 'number.integer',
	hasData: 'boolean',
	hasDetailData: 'boolean',
});

export type TeyvatAccountImaginariumTheater = typeof schema_teyvat_account_imaginarium_theater.infer;

export const schema_teyvat_account_stygian_onslaught = type({
	unlocked: 'boolean',
	difficulty: 'number.integer',
	name: 'string',
	hasData: 'boolean',
});

export type TeyvatAccountStygianOnslaught = typeof schema_teyvat_account_stygian_onslaught.infer;

export const schema_teyvat_account_stats = type({
	achievements: 'number.integer',
	activeDays: 'number.integer',
	characters: 'number.integer',
	spiralAbyss: 'string',
	oculi: schema_teyvat_account_oculi,
	chests: schema_teyvat_account_chests,
	unlockedWaypoints: 'number.integer',
	unlockedDomains: 'number.integer',
	maxFriendshipCharacters: 'number.integer',
	imaginariumTheater: schema_teyvat_account_imaginarium_theater,
	stygianOnslaught: schema_teyvat_account_stygian_onslaught,
});

export type TeyvatAccountStats = typeof schema_teyvat_account_stats.infer;

export const schema_teyvat_account_info = type({
	uid: 'number.integer',
	nickname: 'string',
	pfp: 'string',
	server: schema_teyvat_server,
	level: 'number.integer',
	stats: schema_teyvat_account_stats,
});

export type TeyvatAccountInfo = typeof schema_teyvat_account_info.infer;
