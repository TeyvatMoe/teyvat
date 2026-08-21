import { _enable_account_feature } from '#/client/auto_enable.ts';
import { TeyvatApiError, TeyvatResponseValidationError } from '#/client/errors.ts';
import { _get_http_client } from '#/client/request.ts';
import { _get_hoyolab_genshin_info } from '#/endpoints/hoyolab/genshin/info.ts';
import { schema_teyvat_account_info, type TeyvatAccountInfo } from '#/types/account/info.ts';
import { _sleep } from '#/utils/misc.ts';
import { _recognize_genshin_server } from '#/utils/uid.ts';
import type { TeyvatAccount } from './index.ts';

const ENDPOINT = '/event/game_record/genshin/api/index';
const ENABLE_RETRY_DELAYS = [250, 500, 1_000, 2_000] as const;

function _is_info_private(cause: unknown): cause is TeyvatApiError {
	return cause instanceof TeyvatApiError && cause.retcode === 10102;
}

function _explored(raw_percentage: number): number {
	if (!Number.isSafeInteger(raw_percentage) || raw_percentage < 0)
		throw new TypeError('exploration_percentage must be a nonnegative safe integer');
	return raw_percentage / 10;
}

async function _request_info(account: TeyvatAccount) {
	return await _get_hoyolab_genshin_info(_get_http_client(account.inst), account.uid, account.server);
}

export async function _get_account_info(account: TeyvatAccount): Promise<TeyvatAccountInfo> {
	const server = _recognize_genshin_server(account.uid);
	let raw: Awaited<ReturnType<typeof _request_info>>;
	try {
		raw = await _request_info(account);
	} catch (cause) {
		if (!(account.inst.auto_enable && _is_info_private(cause))) throw cause;
		await _enable_account_feature(account, 'battle_chronicle', cause);
		let retry_error: TeyvatApiError = cause;
		let enabled_info: Awaited<ReturnType<typeof _request_info>> | undefined;
		for (const delay of ENABLE_RETRY_DELAYS) {
			await _sleep(delay);
			try {
				enabled_info = await _request_info(account);
				break;
			} catch (retry_cause) {
				if (!_is_info_private(retry_cause)) throw retry_cause;
				retry_error = retry_cause;
			}
		}
		if (!enabled_info) throw retry_error;
		raw = enabled_info;
	}

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
			}));
			if (exploration.type === 'Reputation' && !offerings.some((offering) => offering.name === 'Reputation'))
				offerings.unshift({ name: 'Reputation', level: exploration.level, icon: '' });

			return {
				id: exploration.id,
				parent_id: exploration.parent_id,
				name: exploration.name,
				explored: _explored(exploration.exploration_percentage),
				visuals: {
					icon: exploration.icon,
					inner_icon: exploration.inner_icon,
					background_image: exploration.background_image,
					cover: exploration.cover,
					map_url: exploration.map_url,
				},
				offerings,
				areas: (exploration.area_exploration_list ?? []).map((area) => ({
					name: area.name,
					explored: _explored(area.exploration_percentage),
				})),
				bosses: (exploration.boss_list ?? []).map((boss) => ({ name: boss.name, kills: boss.kill_num })),
				natlan_tribes: (exploration.natan_reputation?.tribal_list ?? []).map((tribe) => ({
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
					adeptal_energy: {
						value: home.comfort_num,
						name: home.comfort_level_name,
						icon: home.comfort_level_icon,
					},
					realms: realms.map((realm) => ({ name: realm.name, icon: realm.icon })),
				}
			: null;

		return schema_teyvat_account_info.assert({
			uid: account.uid,
			nickname: raw.role.nickname,
			pfp: raw.role.game_head_icon || raw.role.AvatarUrl,
			server,
			level: raw.role.level,
			stats: {
				achievements: raw.stats.achievement_number,
				active_days: raw.stats.active_day_number,
				characters: raw.stats.avatar_number,
				spiral_abyss: raw.stats.spiral_abyss,
				oculi: {
					anemo: raw.stats.anemoculus_number,
					geo: raw.stats.geoculus_number,
					electro: raw.stats.electroculus_number,
					dendro: raw.stats.dendroculus_number,
					hydro: raw.stats.hydroculus_number,
					pyro: raw.stats.pyroculus_number,
					lunar: raw.stats.moonoculus_number,
				},
				chests: {
					common: raw.stats.common_chest_number,
					exquisite: raw.stats.exquisite_chest_number,
					precious: raw.stats.precious_chest_number,
					luxurious: raw.stats.luxurious_chest_number,
					remarkable: raw.stats.magic_chest_number,
				},
				unlocked_waypoints: raw.stats.way_point_number,
				unlocked_domains: raw.stats.domain_number,
				max_friendship_characters: raw.stats.full_fetter_avatar_num,
				imaginarium_theater: {
					unlocked: raw.stats.role_combat.is_unlock,
					max_act: raw.stats.role_combat.max_round_id,
					has_data: raw.stats.role_combat.has_data,
					has_detail_data: raw.stats.role_combat.has_detail_data,
				},
				stygian_onslaught: {
					unlocked: raw.stats.hard_challenge.is_unlock,
					difficulty: raw.stats.hard_challenge.difficulty,
					name: raw.stats.hard_challenge.name,
					has_data: raw.stats.hard_challenge.has_data,
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
