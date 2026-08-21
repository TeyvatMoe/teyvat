import { _requestWithAutoEnable } from '#/client/auto_enable.ts';
import { TeyvatApiError, TeyvatResponseValidationError } from '#/client/errors.ts';
import { _getHttpClient } from '#/client/request.ts';
import { _getHoyolabGenshinImaginariumTheater } from '#/endpoints/hoyolab/genshin/imaginarium_theater.ts';
import {
	schemaTeyvatAccountImaginariumTheater,
	type TeyvatAccountImaginariumTheater,
	type TeyvatImaginariumTheaterCharacterRole,
	type TeyvatImaginariumTheaterDifficulty,
} from '#/types/account/imaginarium_theater.ts';
import { _unixDate } from '#/utils/misc.ts';
import { _getAccountOwner, type TeyvatAccount } from './index.ts';

const ENDPOINT = '/event/game_record/genshin/api/role_combat';

function _isImaginariumTheaterPrivate(cause: unknown): cause is TeyvatApiError {
	return cause instanceof TeyvatApiError && cause.retcode === 10102;
}

function _imaginariumTheaterDifficulty(value: number): TeyvatImaginariumTheaterDifficulty {
	if (value === 1) return 'easy';
	if (value === 2) return 'normal';
	if (value === 3) return 'hard';
	if (value === 4) return 'visionary';
	if (value === 5) return 'arcana';
	return 'unknown';
}

function _imaginariumTheaterCharacterRole(value?: number): TeyvatImaginariumTheaterCharacterRole {
	if (value === 1) return 'normal';
	if (value === 2) return 'trial';
	if (value === 3) return 'support';
	return 'unknown';
}

function _rankingValue(value: number | string): number {
	if (value === '') return 0;
	if (typeof value === 'string' && !/^\d+$/.test(value)) throw new TypeError('Theater ranking value must be numeric');
	const numeric = Number(value);
	if (!Number.isSafeInteger(numeric) || numeric < 0)
		throw new TypeError('Theater ranking value must be a nonnegative safe integer');
	return numeric;
}

async function _requestImaginariumTheater(account: TeyvatAccount) {
	return await _getHoyolabGenshinImaginariumTheater(
		_getHttpClient(_getAccountOwner(account)),
		account.uid,
		account.server,
	);
}

export async function _getAccountImaginariumTheater(account: TeyvatAccount): Promise<TeyvatAccountImaginariumTheater> {
	const raw = await _requestWithAutoEnable(
		account,
		'battle_chronicle',
		() => _requestImaginariumTheater(account),
		_isImaginariumTheaterPrivate,
	);

	try {
		const character = (item: {
			id?: number;
			avatarId?: number;
			icon?: string;
			avatarIcon?: string;
			rarity: number;
			level?: number;
			avatarType?: number;
		}) => {
			const id = item.id ?? item.avatarId;
			const icon = item.icon ?? item.avatarIcon;
			if (id === undefined || icon === undefined) throw new TypeError('Theater character identity is incomplete');
			return {
				id,
				icon,
				rarity: item.rarity,
				level: item.level ?? null,
				role: _imaginariumTheaterCharacterRole(item.avatarType),
			};
		};
		const buff = (item: { id: number; icon: string; name: string; desc: string; ['is_enhanced']: boolean }) => ({
			id: item.id,
			icon: item.icon,
			name: item.name,
			description: item.desc,
			receivedAudienceSupport: item.is_enhanced,
		});
		const rankedCharacter = (
			item: {
				avatarId?: number;
				avatarIcon?: string;
				rarity?: number;
				value?: number | string;
			} | null,
		) => {
			if (!item?.avatarId) return null;
			if (item.avatarIcon === undefined || item.rarity === undefined || item.value === undefined)
				throw new TypeError('Theater ranking character is incomplete');
			return {
				id: item.avatarId,
				icon: item.avatarIcon,
				rarity: item.rarity,
				value: _rankingValue(item.value),
			};
		};

		return schemaTeyvatAccountImaginariumTheater.assert({
			unlocked: raw.is_unlock,
			seasons: raw.data.map((season) => {
				const detail = season.detail;
				const battleStatistics = detail?.fight_statisic;
				return {
					hasData: season.has_data,
					hasDetailData: season.has_detail_data,
					schedule: {
						id: season.schedule.schedule_id,
						type: season.schedule.schedule_type,
						startsAt: _unixDate(season.schedule.start_time, 'schedule.start_time'),
						endsAt: _unixDate(season.schedule.end_time, 'schedule.end_time'),
					},
					statistics: {
						difficulty: _imaginariumTheaterDifficulty(season.stat.difficulty_id),
						bestAct: season.stat.max_round_id,
						heraldry: season.stat.heraldry,
						starChallenges: season.stat.get_medal_round_list,
						fantasiaFlowersUsed: season.stat.coin_num,
						audienceSupportTriggers: season.stat.avatar_bonus_num,
						supportCharactersShared: season.stat.rent_cnt,
						medals: season.stat.medal_num,
					},
					acts: (detail?.rounds_data ?? []).map((act) => ({
						number: act.round_id,
						completedAt: _unixDate(act.finish_time, 'detail.rounds_data.finish_time'),
						medalObtained: act.is_get_medal,
						arcana: { active: act.is_tarot ?? false, number: act.tarot_serial_no ?? null },
						characters: act.avatars.map(character),
						mysteryCaches: act.choice_cards.map(buff),
						wondrousBooms: act.buffs.map(buff),
					})),
					backupCharacters: (detail?.backup_avatars ?? []).map(character),
					battleStatistics: battleStatistics
						? {
								mostDefeats: rankedCharacter(battleStatistics.max_defeat_avatar),
								strongestStrike: rankedCharacter(battleStatistics.max_damage_avatar),
								mostDamageTaken: rankedCharacter(battleStatistics.max_take_damage_avatar),
								fastestCasts: battleStatistics.shortest_avatar_list
									.map(rankedCharacter)
									.filter((item) => item !== null),
								totalCastSeconds: battleStatistics.total_use_time,
							}
						: null,
				};
			}),
		});
	} catch (cause) {
		throw new TeyvatResponseValidationError('GET', ENDPOINT, [String(cause)], { cause });
	}
}
