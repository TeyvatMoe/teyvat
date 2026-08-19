import { type } from 'arktype';

export interface TeyvatDailyNotesOptions {
	auto_enable?: boolean;
}

export const schema_teyvat_expedition_status = type.enumerated('ongoing', 'finished', 'unknown');
export type TeyvatExpeditionStatus = typeof schema_teyvat_expedition_status.infer;

export const schema_teyvat_task_reward_status = type.enumerated('unfinished', 'finished', 'claimed', 'unknown');
export type TeyvatTaskRewardStatus = typeof schema_teyvat_task_reward_status.infer;

export const schema_teyvat_attendance_reward_status = type.enumerated(
	'available',
	'claimed',
	'forbidden',
	'unavailable',
	'unknown',
);
export type TeyvatAttendanceRewardStatus = typeof schema_teyvat_attendance_reward_status.infer;

export const schema_teyvat_archon_quest_status = type.enumerated('ongoing', 'not_open', 'unknown');
export type TeyvatArchonQuestStatus = typeof schema_teyvat_archon_quest_status.infer;

export const schema_teyvat_account_daily_notes_resource = type({
	current: 'number.integer',
	maximum: 'number.integer',
	fully_recovered_at: 'Date',
});
export type TeyvatAccountDailyNotesResource = typeof schema_teyvat_account_daily_notes_resource.infer;

export const schema_teyvat_account_expedition = type({
	character_icon: 'string',
	status: schema_teyvat_expedition_status,
	completes_at: 'Date',
});
export type TeyvatAccountExpedition = typeof schema_teyvat_account_expedition.infer;

export const schema_teyvat_account_transformer = type({
	obtained: 'boolean',
	available_at: 'Date | null',
});
export type TeyvatAccountTransformer = typeof schema_teyvat_account_transformer.infer;

export const schema_teyvat_account_task_reward = type({
	status: schema_teyvat_task_reward_status,
});
export type TeyvatAccountTaskReward = typeof schema_teyvat_account_task_reward.infer;

export const schema_teyvat_account_attendance_reward = type({
	status: schema_teyvat_attendance_reward_status,
	progress: 'number.integer',
});
export type TeyvatAccountAttendanceReward = typeof schema_teyvat_account_attendance_reward.infer;

export const schema_teyvat_account_daily_tasks = type({
	completed: 'number.integer',
	total: 'number.integer',
	reward_claimed: 'boolean',
	task_rewards: [schema_teyvat_account_task_reward, '[]'],
	attendance: {
		visible: 'boolean',
		stored: 'number',
		refreshes_at: 'Date | null',
		rewards: [schema_teyvat_account_attendance_reward, '[]'],
	},
});
export type TeyvatAccountDailyTasks = typeof schema_teyvat_account_daily_tasks.infer;

export const schema_teyvat_account_archon_quest = type({
	id: 'number.integer',
	status: schema_teyvat_archon_quest_status,
	chapter_number: 'string',
	title: 'string',
});
export type TeyvatAccountArchonQuest = typeof schema_teyvat_account_archon_quest.infer;

export const schema_teyvat_account_archon_quest_progress = type({
	quests: [schema_teyvat_account_archon_quest, '[]'],
	all_mainlines_finished: 'boolean',
	unlocked: 'boolean',
	all_interchapters_finished: 'boolean',
});
export type TeyvatAccountArchonQuestProgress = typeof schema_teyvat_account_archon_quest_progress.infer;

export const schema_teyvat_account_daily_notes = type({
	resin: schema_teyvat_account_daily_notes_resource,
	realm_currency: schema_teyvat_account_daily_notes_resource,
	commissions: {
		completed: 'number.integer',
		total: 'number.integer',
		reward_claimed: 'boolean',
	},
	weekly_boss_discounts: {
		remaining: 'number.integer',
		limit: 'number.integer',
	},
	expeditions: {
		maximum: 'number.integer',
		items: [schema_teyvat_account_expedition, '[]'],
	},
	transformer: schema_teyvat_account_transformer,
	daily_tasks: schema_teyvat_account_daily_tasks,
	archon_quest_progress: schema_teyvat_account_archon_quest_progress,
});
export type TeyvatAccountDailyNotes = typeof schema_teyvat_account_daily_notes.infer;
