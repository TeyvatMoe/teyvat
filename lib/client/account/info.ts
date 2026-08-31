import { _requestWithAutoEnable } from '#/client/auto_enable.ts';
import { TeyvatApiError, TeyvatResponseValidationError } from '#/client/errors.ts';
import { _getHttpClient } from '#/client/request.ts';
import { _getHoyolabGenshinInfo } from '#/endpoints/hoyolab/genshin/info.ts';
import { schemaTeyvatAccountInfo, type TeyvatAccountInfo } from '#/types/account/info.ts';
import { _recognizeGenshinServer } from '#/utils/uid.ts';
import { _getAccountOwner, type TeyvatAccount } from './index.ts';

const ENDPOINT = '/event/game_record/genshin/api/index';

function _isInfoPrivate(cause: unknown): cause is TeyvatApiError {
	return cause instanceof TeyvatApiError && cause.retcode === 10102;
}

function _explored(rawPercentage: number): number {
	if (!Number.isSafeInteger(rawPercentage) || rawPercentage < 0)
		throw new TypeError('exploration_percentage must be a nonnegative safe integer');
	return rawPercentage / 10;
}

function _offeringStatus(value: string | undefined): 'locked' | 'unlocked' | 'unknown' {
	if (value === 'OfferingOpenStateLocked') return 'locked';
	if (value === 'OfferingOpenStateUnlocked') return 'unlocked';
	return 'unknown';
}

async function _requestInfo(account: TeyvatAccount) {
	return await _getHoyolabGenshinInfo(_getHttpClient(_getAccountOwner(account)), account.uid, account.server);
}

type RawInfo = Awaited<ReturnType<typeof _requestInfo>>;
type RawExploration = RawInfo['world_explorations'][number];

function _offerings(exploration: RawExploration) {
	const offerings = (exploration.offerings ?? []).map((offering) => ({
		name: offering.name,
		level: offering.level,
		icon: offering.icon ?? '',
		status: _offeringStatus(offering.open_state),
	}));
	if (exploration.type === 'Reputation' && !offerings.some((offering) => offering.name === 'Reputation'))
		offerings.unshift({ name: 'Reputation', level: exploration.level, icon: '', status: 'unknown' });
	return offerings;
}

function _exploration(exploration: RawExploration) {
	return {
		id: exploration.id,
		name: exploration.name,
		explored: _explored(exploration.exploration_percentage),
		sevenStatueLevel: exploration.seven_statue_level,
		visuals: {
			icon: exploration.icon,
			innerIcon: exploration.inner_icon,
			backgroundImage: exploration.background_image,
			cover: exploration.cover,
			mapUrl: exploration.map_url,
		},
		offerings: _offerings(exploration),
		areas: (exploration.area_exploration_list ?? []).map((area) => ({
			name: area.name,
			explored: _explored(area.exploration_percentage),
		})),
		bosses: (exploration.boss_list ?? []).map((boss) => ({ name: boss.name, kills: boss.kill_num })),
		natlanTribes: (exploration.natan_reputation?.tribal_list ?? []).map((tribe) => ({
			id: tribe.id,
			name: tribe.name,
			level: tribe.level,
			icon: tribe.icon,
			image: tribe.image,
		})),
	};
}

function _uniqueBy<T>(values: T[], key: (value: T) => string | number): T[] {
	const seen = new Set<string | number>();
	return values.filter((value) => {
		const identity = key(value);
		if (seen.has(identity)) return false;
		seen.add(identity);
		return true;
	});
}

function _specialRegion(explorations: RawExploration[], explorationPercentage: number) {
	const root = explorations[0];
	if (!root) throw new TypeError('special region must reference at least one exploration');
	const mapped = explorations.map(_exploration);
	const areas = explorations.flatMap((exploration, index) => [
		...(index > 0 || exploration.exploration_percentage > 0
			? [{ name: exploration.name, explored: _explored(exploration.exploration_percentage) }]
			: []),
		...(exploration.area_exploration_list ?? []).map((area) => ({
			name: area.name,
			explored: _explored(area.exploration_percentage),
		})),
	]);

	return {
		..._exploration(root),
		explored: _explored(explorationPercentage),
		offerings: _uniqueBy(
			mapped.flatMap((exploration) => exploration.offerings),
			(offering) => offering.name,
		),
		areas: _uniqueBy(areas, (area) => area.name),
		bosses: _uniqueBy(
			mapped.flatMap((exploration) => exploration.bosses),
			(boss) => boss.name,
		),
		natlanTribes: _uniqueBy(
			mapped.flatMap((exploration) => exploration.natlanTribes),
			(tribe) => tribe.id,
		),
	};
}

function _explorations(raw: RawInfo) {
	const byId = new Map<number, RawExploration>();
	for (const exploration of raw.world_explorations) {
		if (byId.has(exploration.id)) throw new TypeError(`duplicate exploration id ${exploration.id}`);
		byId.set(exploration.id, exploration);
	}

	const referenced = new Set<number>();
	const resolve = (id: number) => {
		if (referenced.has(id)) throw new TypeError(`exploration id ${id} is referenced more than once`);
		const exploration = byId.get(id);
		if (!exploration) throw new TypeError(`exploration id ${id} is missing`);
		referenced.add(id);
		return exploration;
	};

	return raw.world_exploration_display.map((display) => ({
		..._exploration(resolve(display.exploration_id)),
		specialRegions: display.group.items.map((group) =>
			_specialRegion(group.area_ids.map(resolve), group.exploration_percentage),
		),
	}));
}

export async function _getAccountInfo(account: TeyvatAccount): Promise<TeyvatAccountInfo> {
	const server = _recognizeGenshinServer(account.uid);
	const raw = await _requestWithAutoEnable(account, 'battle_chronicle', () => _requestInfo(account), _isInfoPrivate);

	if (raw.role.region && raw.role.region !== server) {
		throw new TeyvatResponseValidationError('GET', '/event/game_record/genshin/api/index', [
			`role.region must be ${server} (was ${raw.role.region})`,
		]);
	}

	try {
		const explorations = _explorations(raw);

		const homes = raw.homes;
		const home = Array.isArray(homes) ? homes[0] : homes;
		const realms = Array.isArray(homes) ? homes : (homes?.realms ?? []);
		const teapot = home
			? {
					level: home.level,
					visitors: home.visit_num,
					furnishings: home.item_num,
					adeptalEnergy: {
						value: home.comfort_num,
						name: home.comfort_level_name,
						icon: home.comfort_level_icon,
					},
					realms: realms.map((realm) => ({ name: realm.name, icon: realm.icon })),
				}
			: null;

		return schemaTeyvatAccountInfo.assert({
			uid: account.uid,
			nickname: raw.role.nickname,
			pfp: raw.role.game_head_icon || raw.role.AvatarUrl,
			server,
			level: raw.role.level,
			stats: {
				achievements: raw.stats.achievement_number,
				activeDays: raw.stats.active_day_number,
				characters: raw.stats.avatar_number,
				spiralAbyss: raw.stats.spiral_abyss,
				oculi: {
					anemo: raw.stats.anemoculus_number,
					geo: raw.stats.geoculus_number,
					electro: raw.stats.electroculus_number,
					dendro: raw.stats.dendroculus_number,
					hydro: raw.stats.hydroculus_number,
					pyro: raw.stats.pyroculus_number,
					lunar: raw.stats.moonoculus_number,
					cryo: raw.stats.iceculus_number,
				},
				chests: {
					common: raw.stats.common_chest_number,
					exquisite: raw.stats.exquisite_chest_number,
					precious: raw.stats.precious_chest_number,
					luxurious: raw.stats.luxurious_chest_number,
					remarkable: raw.stats.magic_chest_number,
				},
				unlockedWaypoints: raw.stats.way_point_number,
				unlockedDomains: raw.stats.domain_number,
				maxFriendshipCharacters: raw.stats.full_fetter_avatar_num,
				imaginariumTheater: {
					unlocked: raw.stats.role_combat.is_unlock,
					maxAct: raw.stats.role_combat.max_round_id,
					hasData: raw.stats.role_combat.has_data,
					hasDetailData: raw.stats.role_combat.has_detail_data,
				},
				stygianOnslaught: {
					unlocked: raw.stats.hard_challenge.is_unlock,
					difficulty: raw.stats.hard_challenge.difficulty,
					name: raw.stats.hard_challenge.name,
					hasData: raw.stats.hard_challenge.has_data,
				},
			},
			explorations,
			teapot,
		});
	} catch (cause) {
		throw new TeyvatResponseValidationError('GET', ENDPOINT, [String(cause)], {
			cause,
		});
	}
}
