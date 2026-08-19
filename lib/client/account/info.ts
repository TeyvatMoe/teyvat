import { _get_hoyolab_genshin_info } from '../../endpoints/hoyolab/genshin/info.ts';
import { schema_teyvat_account_info, type TeyvatAccountInfo } from '../../types/account/info.ts';
import { _recognize_genshin_server } from '../../utils/uid.ts';
import { TeyvatResponseValidationError } from '../errors.ts';
import { getHttpClient } from '../request.ts';
import type { TeyvatAccount } from './index.ts';

export async function _get_account_info(account: TeyvatAccount): Promise<TeyvatAccountInfo> {
	const server = _recognize_genshin_server(account.uid);
	const raw = await _get_hoyolab_genshin_info(getHttpClient(account.inst), account.uid, server);

	if (raw.role.region && raw.role.region !== server) {
		throw new TeyvatResponseValidationError('GET', '/event/game_record/genshin/api/index', [
			`role.region must be ${server} (was ${raw.role.region})`,
		]);
	}

	try {
		return schema_teyvat_account_info.assert({
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
		});
	} catch (cause) {
		throw new TeyvatResponseValidationError('GET', '/event/game_record/genshin/api/index', [String(cause)], {
			cause,
		});
	}
}
