import { _enable_account_feature } from '#/client/auto_enable.ts';
import { TeyvatApiError, TeyvatResponseValidationError } from '#/client/errors.ts';
import { _get_http_client } from '#/client/request.ts';
import { _get_hoyolab_genshin_daily_notes } from '#/endpoints/hoyolab/genshin/daily_notes.ts';
import {
	schema_teyvat_account_daily_notes,
	type TeyvatAccountDailyNotes,
	type TeyvatArchonQuestStatus,
	type TeyvatAttendanceRewardStatus,
	type TeyvatExpeditionStatus,
	type TeyvatTaskRewardStatus,
} from '#/types/account/daily_notes.ts';
import { _completion_date, _numeric_value, _sleep } from '#/utils/misc.ts';
import type { TeyvatAccount } from './index.ts';

const ENDPOINT = '/event/game_record/genshin/api/dailyNote';
const ENABLE_RETRY_DELAYS = [250, 500, 1_000, 2_000] as const;

function _is_daily_notes_private(cause: unknown): cause is TeyvatApiError {
	return cause instanceof TeyvatApiError && cause.retcode === 10102;
}

function _expedition_status(status: string): TeyvatExpeditionStatus {
	if (status === 'Ongoing') return 'ongoing';
	if (status === 'Finished') return 'finished';
	return 'unknown';
}

function _task_reward_status(status: string): TeyvatTaskRewardStatus {
	if (status === 'TaskRewardStatusUnfinished') return 'unfinished';
	if (status === 'TaskRewardStatusFinished') return 'finished';
	if (status === 'TaskRewardStatusTakenAward') return 'claimed';
	return 'unknown';
}

function _attendance_reward_status(status: string): TeyvatAttendanceRewardStatus {
	if (status === 'AttendanceRewardStatusWaitTaken') return 'available';
	if (status === 'AttendanceRewardStatusTakenAward') return 'claimed';
	if (status === 'AttendanceRewardStatusForbid') return 'forbidden';
	if (status === 'AttendanceRewardStatusUnfinished') return 'unavailable';
	return 'unknown';
}

function _archon_quest_status(status: string): TeyvatArchonQuestStatus {
	if (status === 'StatusOngoing') return 'ongoing';
	if (status === 'StatusNotOpen') return 'not_open';
	return 'unknown';
}

async function _request_daily_notes(account: TeyvatAccount) {
	return await _get_hoyolab_genshin_daily_notes(_get_http_client(account.inst), account.uid, account.server);
}

export async function _get_account_daily_notes(account: TeyvatAccount): Promise<TeyvatAccountDailyNotes> {
	let raw: Awaited<ReturnType<typeof _request_daily_notes>>;
	try {
		raw = await _request_daily_notes(account);
	} catch (cause) {
		if (!(account.inst.auto_enable && _is_daily_notes_private(cause))) throw cause;
		await _enable_account_feature(account, 'daily_notes', cause);
		let retry_error: TeyvatApiError = cause;
		let enabled_notes: Awaited<ReturnType<typeof _request_daily_notes>> | undefined;
		for (const delay of ENABLE_RETRY_DELAYS) {
			await _sleep(delay);
			try {
				enabled_notes = await _request_daily_notes(account);
				break;
			} catch (retry_cause) {
				if (!_is_daily_notes_private(retry_cause)) throw retry_cause;
				retry_error = retry_cause;
			}
		}
		if (!enabled_notes) throw retry_error;
		raw = enabled_notes;
	}

	const now = Date.now();
	try {
		const transformer_recovery = raw.transformer.recovery_time;
		const transformer_seconds = transformer_recovery
			? transformer_recovery.Day * 86_400 +
				transformer_recovery.Hour * 3_600 +
				transformer_recovery.Minute * 60 +
				transformer_recovery.Second
			: 0;
		const attendance_refresh = raw.daily_task.attendance_refresh_time;

		return schema_teyvat_account_daily_notes.assert({
			resin: {
				current: raw.current_resin,
				maximum: raw.max_resin,
				fully_recovered_at: _completion_date(now, raw.resin_recovery_time, 'resin_recovery_time'),
			},
			realm_currency: {
				current: raw.current_home_coin,
				maximum: raw.max_home_coin,
				fully_recovered_at: _completion_date(now, raw.home_coin_recovery_time, 'home_coin_recovery_time'),
			},
			commissions: {
				completed: raw.finished_task_num,
				total: raw.total_task_num,
				reward_claimed: raw.is_extra_task_reward_received,
			},
			weekly_boss_discounts: {
				remaining: raw.remain_resin_discount_num,
				limit: raw.resin_discount_num_limit,
			},
			expeditions: {
				maximum: raw.max_expedition_num,
				items: raw.expeditions.map((expedition) => ({
					character_icon: expedition.avatar_side_icon,
					status: _expedition_status(expedition.status),
					completes_at: _completion_date(now, expedition.remained_time, 'expeditions.remained_time'),
				})),
			},
			transformer: {
				obtained: raw.transformer.obtained,
				available_at: raw.transformer.obtained
					? _completion_date(now, transformer_seconds, 'transformer')
					: null,
			},
			daily_tasks: {
				completed: raw.daily_task.finished_num,
				total: raw.daily_task.total_num,
				reward_claimed: raw.daily_task.is_extra_task_reward_received,
				task_rewards: raw.daily_task.task_rewards.map((reward) => ({
					status: _task_reward_status(reward.status),
				})),
				attendance: {
					visible: raw.daily_task.attendance_visible,
					stored: _numeric_value(raw.daily_task.stored_attendance, 'daily_task.stored_attendance'),
					refreshes_at:
						attendance_refresh === null || attendance_refresh === undefined
							? null
							: _completion_date(now, attendance_refresh, 'daily_task.attendance_refresh_time'),
					rewards: raw.daily_task.attendance_rewards.map((reward) => ({
						status: _attendance_reward_status(reward.status),
						progress: reward.progress,
					})),
				},
			},
			archon_quest_progress: {
				quests: raw.archon_quest_progress.list.map((quest) => ({
					id: quest.id,
					status: _archon_quest_status(quest.status),
					chapter_number: quest.chapter_num,
					title: quest.chapter_title,
				})),
				all_mainlines_finished: raw.archon_quest_progress.is_finish_all_mainline,
				unlocked: raw.archon_quest_progress.is_open_archon_quest,
				all_interchapters_finished: raw.archon_quest_progress.is_finish_all_interchapter,
			},
		});
	} catch (cause) {
		throw new TeyvatResponseValidationError('GET', ENDPOINT, [String(cause)], { cause });
	}
}
