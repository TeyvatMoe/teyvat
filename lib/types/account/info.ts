import { type } from 'arktype';
import { schemaTeyvatServer } from './server.ts';

const schemaTeyvatAccountOculi = type({
	anemo: 'number.integer',
	geo: 'number.integer',
	electro: 'number.integer',
	dendro: 'number.integer',
	hydro: 'number.integer',
	pyro: 'number.integer',
	lunar: 'number.integer',
	cryo: 'number.integer',
});

const schemaTeyvatAccountChests = type({
	common: 'number.integer',
	exquisite: 'number.integer',
	precious: 'number.integer',
	luxurious: 'number.integer',
	remarkable: 'number.integer',
});

const schemaTeyvatAccountImaginariumTheater = type({
	unlocked: 'boolean',
	maxAct: 'number.integer',
	hasData: 'boolean',
	hasDetailData: 'boolean',
});

const schemaTeyvatAccountStygianOnslaught = type({
	unlocked: 'boolean',
	difficulty: 'number.integer',
	name: 'string',
	hasData: 'boolean',
});

const schemaTeyvatAccountStats = type({
	achievements: 'number.integer',
	activeDays: 'number.integer',
	characters: 'number.integer',
	spiralAbyss: 'string',
	oculi: schemaTeyvatAccountOculi,
	chests: schemaTeyvatAccountChests,
	unlockedWaypoints: 'number.integer',
	unlockedDomains: 'number.integer',
	maxFriendshipCharacters: 'number.integer',
	imaginariumTheater: schemaTeyvatAccountImaginariumTheater,
	stygianOnslaught: schemaTeyvatAccountStygianOnslaught,
});

const schemaTeyvatExplorationVisuals = type({
	icon: 'string',
	innerIcon: 'string',
	backgroundImage: 'string',
	cover: 'string',
	mapUrl: 'string',
});

const schemaTeyvatExplorationOffering = type({
	name: 'string',
	level: 'number.integer',
	icon: 'string',
});

const schemaTeyvatExplorationArea = type({
	name: 'string',
	explored: 'number >= 0',
});

const schemaTeyvatExplorationBoss = type({
	name: 'string',
	kills: 'number.integer',
});

const schemaTeyvatExplorationNatlanTribe = type({
	id: 'number.integer',
	name: 'string',
	level: 'number.integer',
	icon: 'string',
	image: 'string',
});

const schemaTeyvatAccountExploration = type({
	id: 'number.integer',
	parentId: 'number.integer',
	name: 'string',
	explored: 'number >= 0',
	visuals: schemaTeyvatExplorationVisuals,
	offerings: schemaTeyvatExplorationOffering.array(),
	areas: schemaTeyvatExplorationArea.array(),
	bosses: schemaTeyvatExplorationBoss.array(),
	natlanTribes: schemaTeyvatExplorationNatlanTribe.array(),
});

const schemaTeyvatTeapotRealm = type({
	name: 'string',
	icon: 'string',
});

const schemaTeyvatAccountTeapot = type({
	level: 'number.integer',
	visitors: 'number.integer',
	furnishings: 'number.integer',
	adeptalEnergy: {
		value: 'number.integer',
		name: 'string',
		icon: 'string',
	},
	realms: schemaTeyvatTeapotRealm.array(),
});

export const schemaTeyvatAccountInfo = type({
	uid: 'number.integer',
	nickname: 'string',
	pfp: 'string',
	server: schemaTeyvatServer,
	level: 'number.integer',
	stats: schemaTeyvatAccountStats,
	explorations: schemaTeyvatAccountExploration.array(),
	teapot: schemaTeyvatAccountTeapot.or('null'),
});

/** @category Account Info */

/**
 * @interface
 * @useDeclaredType
 * @category Account Info
 */
export type TeyvatAccountInfo = typeof schemaTeyvatAccountInfo.infer;
