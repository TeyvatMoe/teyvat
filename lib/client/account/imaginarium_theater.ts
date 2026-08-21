import { _enable_account_feature } from '#/client/auto_enable.ts';
import { TeyvatApiError, TeyvatResponseValidationError } from '#/client/errors.ts';
import { _get_http_client } from '#/client/request.ts';
import { _get_hoyolab_genshin_imaginarium_theater } from '#/endpoints/hoyolab/genshin/imaginarium_theater.ts';
import {
	schema_teyvat_account_imaginarium_theater,
	type TeyvatAccountImaginariumTheater,
	type TeyvatImaginariumTheaterCharacterRole,
	type TeyvatImaginariumTheaterDifficulty,
} from '#/types/account/imaginarium_theater.ts';
import { _sleep, _unix_date } from '#/utils/misc.ts';
import type { TeyvatAccount } from './index.ts';

const ENDPOINT = '/event/game_record/genshin/api/role_combat';
const ENABLE_RETRY_DELAYS = [250, 500, 1_000, 2_000] as const;

function _is_imaginarium_theater_private(cause: unknown): cause is TeyvatApiError {
	return cause instanceof TeyvatApiError && cause.retcode === 10102;
}

function _imaginarium_theater_difficulty(value: number): TeyvatImaginariumTheaterDifficulty {
	if (value === 1) return 'easy';
	if (value === 2) return 'normal';
	if (value === 3) return 'hard';
	if (value === 4) return 'visionary';
	if (value === 5) return 'arcana';
	return 'unknown';
}

function _imaginarium_theater_character_role(value?: number): TeyvatImaginariumTheaterCharacterRole {
	if (value === 1) return 'normal';
	if (value === 2) return 'trial';
	if (value === 3) return 'support';
	return 'unknown';
}

function _ranking_value(value: number | string): number {
	if (value === '') return 0;
	if (typeof value === 'string' && !/^\d+$/.test(value)) throw new TypeError('Theater ranking value must be numeric');
	const numeric = Number(value);
	if (!Number.isSafeInteger(numeric) || numeric < 0)
		throw new TypeError('Theater ranking value must be a nonnegative safe integer');
	return numeric;
}

async function _request_imaginarium_theater(account: TeyvatAccount) {
	return await _get_hoyolab_genshin_imaginarium_theater(_get_http_client(account.inst), account.uid, account.server);
}

export async function _get_account_imaginarium_theater(
	account: TeyvatAccount,
): Promise<TeyvatAccountImaginariumTheater> {
	let raw: Awaited<ReturnType<typeof _request_imaginarium_theater>>;
	try {
		raw = await _request_imaginarium_theater(account);
	} catch (cause) {
		if (!(account.inst.auto_enable && _is_imaginarium_theater_private(cause))) throw cause;
		await _enable_account_feature(account, 'battle_chronicle', cause);
		let retry_error: TeyvatApiError = cause;
		let enabled_theater: Awaited<ReturnType<typeof _request_imaginarium_theater>> | undefined;
		for (const delay of ENABLE_RETRY_DELAYS) {
			await _sleep(delay);
			try {
				enabled_theater = await _request_imaginarium_theater(account);
				break;
			} catch (retry_cause) {
				if (!_is_imaginarium_theater_private(retry_cause)) throw retry_cause;
				retry_error = retry_cause;
			}
		}
		if (!enabled_theater) throw retry_error;
		raw = enabled_theater;
	}

	try {
		const character = (item: {
			id?: number;
			avatar_id?: number;
			icon?: string;
			avatar_icon?: string;
			rarity: number;
			level?: number;
			avatar_type?: number;
		}) => {
			const id = item.id ?? item.avatar_id;
			const icon = item.icon ?? item.avatar_icon;
			if (id === undefined || icon === undefined) throw new TypeError('Theater character identity is incomplete');
			return {
				id,
				icon,
				rarity: item.rarity,
				level: item.level ?? null,
				role: _imaginarium_theater_character_role(item.avatar_type),
			};
		};
		const buff = (item: { id: number; icon: string; name: string; desc: string; is_enhanced: boolean }) => ({
			id: item.id,
			icon: item.icon,
			name: item.name,
			description: item.desc,
			received_audience_support: item.is_enhanced,
		});
		const ranked_character = (
			item: {
				avatar_id?: number;
				avatar_icon?: string;
				rarity?: number;
				value?: number | string;
			} | null,
		) => {
			if (!item?.avatar_id) return null;
			if (item.avatar_icon === undefined || item.rarity === undefined || item.value === undefined)
				throw new TypeError('Theater ranking character is incomplete');
			return {
				id: item.avatar_id,
				icon: item.avatar_icon,
				rarity: item.rarity,
				value: _ranking_value(item.value),
			};
		};

		return schema_teyvat_account_imaginarium_theater.assert({
			unlocked: raw.is_unlock,
			seasons: raw.data.map((season) => {
				const detail = season.detail;
				const battle_statistics = detail?.fight_statisic;
				return {
					has_data: season.has_data,
					has_detail_data: season.has_detail_data,
					schedule: {
						id: season.schedule.schedule_id,
						type: season.schedule.schedule_type,
						starts_at: _unix_date(season.schedule.start_time, 'schedule.start_time'),
						ends_at: _unix_date(season.schedule.end_time, 'schedule.end_time'),
					},
					statistics: {
						difficulty: _imaginarium_theater_difficulty(season.stat.difficulty_id),
						best_act: season.stat.max_round_id,
						heraldry: season.stat.heraldry,
						star_challenges: season.stat.get_medal_round_list,
						fantasia_flowers_used: season.stat.coin_num,
						audience_support_triggers: season.stat.avatar_bonus_num,
						support_characters_shared: season.stat.rent_cnt,
						medals: season.stat.medal_num,
					},
					acts: (detail?.rounds_data ?? []).map((act) => ({
						number: act.round_id,
						completed_at: _unix_date(act.finish_time, 'detail.rounds_data.finish_time'),
						medal_obtained: act.is_get_medal,
						arcana: { active: act.is_tarot ?? false, number: act.tarot_serial_no ?? null },
						characters: act.avatars.map(character),
						mystery_caches: act.choice_cards.map(buff),
						wondrous_booms: act.buffs.map(buff),
					})),
					backup_characters: (detail?.backup_avatars ?? []).map(character),
					battle_statistics: battle_statistics
						? {
								most_defeats: ranked_character(battle_statistics.max_defeat_avatar),
								strongest_strike: ranked_character(battle_statistics.max_damage_avatar),
								most_damage_taken: ranked_character(battle_statistics.max_take_damage_avatar),
								fastest_casts: battle_statistics.shortest_avatar_list
									.map(ranked_character)
									.filter((item) => item !== null),
								total_cast_seconds: battle_statistics.total_use_time,
							}
						: null,
				};
			}),
		});
	} catch (cause) {
		throw new TeyvatResponseValidationError('GET', ENDPOINT, [String(cause)], { cause });
	}
}
