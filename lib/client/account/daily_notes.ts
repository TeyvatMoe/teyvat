import { _requestWithAutoEnable } from '#/client/auto_enable.ts';
import { TeyvatApiError, TeyvatResponseValidationError } from '#/client/errors.ts';
import { _getHttpClient } from '#/client/request.ts';
import { _getHoyolabGenshinDailyNotes } from '#/endpoints/hoyolab/genshin/daily_notes.ts';
import {
	schemaTeyvatAccountDailyNotes,
	type TeyvatAccountDailyNotes,
	type TeyvatArchonQuestStatus,
	type TeyvatAttendanceRewardStatus,
	type TeyvatExpeditionStatus,
	type TeyvatTaskRewardStatus,
} from '#/types/account/daily_notes.ts';
import { _completionDate, _numericValue } from '#/utils/misc.ts';
import { _getAccountOwner, type TeyvatAccount } from './index.ts';

const ENDPOINT = '/event/game_record/genshin/api/dailyNote';

function _isDailyNotesPrivate(cause: unknown): cause is TeyvatApiError {
	return cause instanceof TeyvatApiError && cause.retcode === 10102;
}

function _expeditionStatus(status: string): TeyvatExpeditionStatus {
	if (status === 'Ongoing') return 'ongoing';
	if (status === 'Finished') return 'finished';
	return 'unknown';
}

function _taskRewardStatus(status: string): TeyvatTaskRewardStatus {
	if (status === 'TaskRewardStatusUnfinished') return 'unfinished';
	if (status === 'TaskRewardStatusFinished') return 'finished';
	if (status === 'TaskRewardStatusTakenAward') return 'claimed';
	return 'unknown';
}

function _attendanceRewardStatus(status: string): TeyvatAttendanceRewardStatus {
	if (status === 'AttendanceRewardStatusWaitTaken') return 'available';
	if (status === 'AttendanceRewardStatusTakenAward') return 'claimed';
	if (status === 'AttendanceRewardStatusForbid') return 'forbidden';
	if (status === 'AttendanceRewardStatusUnfinished') return 'unavailable';
	return 'unknown';
}

function _archonQuestStatus(status: string): TeyvatArchonQuestStatus {
	if (status === 'StatusOngoing') return 'ongoing';
	if (status === 'StatusNotOpen') return 'not_open';
	return 'unknown';
}

async function _requestDailyNotes(account: TeyvatAccount) {
	return await _getHoyolabGenshinDailyNotes(_getHttpClient(_getAccountOwner(account)), account.uid, account.server);
}

export async function _getAccountDailyNotes(account: TeyvatAccount): Promise<TeyvatAccountDailyNotes> {
	const raw = await _requestWithAutoEnable(
		account,
		'daily_notes',
		() => _requestDailyNotes(account),
		_isDailyNotesPrivate,
	);

	const now = Date.now();
	try {
		const transformerRecovery = raw.transformer.recovery_time;
		const transformerSeconds = transformerRecovery
			? transformerRecovery.Day * 86_400 +
				transformerRecovery.Hour * 3_600 +
				transformerRecovery.Minute * 60 +
				transformerRecovery.Second
			: 0;
		const attendanceRefresh = raw.daily_task.attendance_refresh_time;

		return schemaTeyvatAccountDailyNotes.assert({
			resin: {
				current: raw.current_resin,
				maximum: raw.max_resin,
				fullyRecoveredAt: _completionDate(now, raw.resin_recovery_time, 'resin_recovery_time'),
			},
			realmCurrency: {
				current: raw.current_home_coin,
				maximum: raw.max_home_coin,
				fullyRecoveredAt: _completionDate(now, raw.home_coin_recovery_time, 'home_coin_recovery_time'),
			},
			commissions: {
				completed: raw.finished_task_num,
				total: raw.total_task_num,
				rewardClaimed: raw.is_extra_task_reward_received,
			},
			weeklyBossDiscounts: {
				remaining: raw.remain_resin_discount_num,
				limit: raw.resin_discount_num_limit,
			},
			expeditions: {
				maximum: raw.max_expedition_num,
				items: raw.expeditions.map((expedition) => ({
					characterIcon: expedition.avatar_side_icon,
					status: _expeditionStatus(expedition.status),
					completesAt: _completionDate(now, expedition.remained_time, 'expeditions.remained_time'),
				})),
			},
			transformer: {
				obtained: raw.transformer.obtained,
				availableAt: raw.transformer.obtained ? _completionDate(now, transformerSeconds, 'transformer') : null,
			},
			dailyTasks: {
				completed: raw.daily_task.finished_num,
				total: raw.daily_task.total_num,
				rewardClaimed: raw.daily_task.is_extra_task_reward_received,
				taskRewards: raw.daily_task.task_rewards.map((reward) => ({
					status: _taskRewardStatus(reward.status),
				})),
				attendance: {
					visible: raw.daily_task.attendance_visible,
					stored: _numericValue(raw.daily_task.stored_attendance, 'daily_task.stored_attendance'),
					refreshesAt:
						attendanceRefresh === null || attendanceRefresh === undefined
							? null
							: _completionDate(now, attendanceRefresh, 'daily_task.attendance_refresh_time'),
					rewards: raw.daily_task.attendance_rewards.map((reward) => ({
						status: _attendanceRewardStatus(reward.status),
						progress: reward.progress,
					})),
				},
			},
			archonQuestProgress: {
				quests: raw.archon_quest_progress.list.map((quest) => ({
					id: quest.id,
					status: _archonQuestStatus(quest.status),
					chapterNumber: quest.chapter_num,
					title: quest.chapter_title,
				})),
				allMainlinesFinished: raw.archon_quest_progress.is_finish_all_mainline,
				unlocked: raw.archon_quest_progress.is_open_archon_quest,
				allInterchaptersFinished: raw.archon_quest_progress.is_finish_all_interchapter,
			},
		});
	} catch (cause) {
		throw new TeyvatResponseValidationError('GET', ENDPOINT, [String(cause)], { cause });
	}
}
