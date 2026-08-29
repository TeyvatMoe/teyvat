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

export async function _getAccountInfo(account: TeyvatAccount): Promise<TeyvatAccountInfo> {
	const server = _recognizeGenshinServer(account.uid);
	const raw = await _requestWithAutoEnable(account, 'battle_chronicle', () => _requestInfo(account), _isInfoPrivate);

	if (raw.role.region && raw.role.region !== server) {
		throw new TeyvatResponseValidationError('GET', '/event/game_record/genshin/api/index', [
			`role.region must be ${server} (was ${raw.role.region})`,
		]);
	}

	try {
		const explorations = raw.world_explorations.map((exploration) => {
			const offerings = (exploration.offerings ?? []).map((offering) => ({
				name: offering.name,
				level: offering.level,
				icon: offering.icon ?? '',
				status: _offeringStatus(offering.open_state),
			}));
			if (exploration.type === 'Reputation' && !offerings.some((offering) => offering.name === 'Reputation'))
				offerings.unshift({ name: 'Reputation', level: exploration.level, icon: '', status: 'unknown' });

			return {
				id: exploration.id,
				parentId: exploration.parent_id,
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
				offerings,
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
		});

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
