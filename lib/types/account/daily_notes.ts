import { type } from 'arktype';

const schemaTeyvatExpeditionStatus = type.enumerated('ongoing', 'finished', 'unknown');
/**
 * @useDeclaredType
 * @category Daily Notes
 */
export type TeyvatExpeditionStatus = typeof schemaTeyvatExpeditionStatus.infer;

const schemaTeyvatTaskRewardStatus = type.enumerated('unfinished', 'finished', 'claimed', 'unknown');
/**
 * @useDeclaredType
 * @category Daily Notes
 */
export type TeyvatTaskRewardStatus = typeof schemaTeyvatTaskRewardStatus.infer;

const schemaTeyvatAttendanceRewardStatus = type.enumerated(
	'available',
	'claimed',
	'forbidden',
	'unavailable',
	'unknown',
);
/**
 * @useDeclaredType
 * @category Daily Notes
 */
export type TeyvatAttendanceRewardStatus = typeof schemaTeyvatAttendanceRewardStatus.infer;

const schemaTeyvatArchonQuestStatus = type.enumerated('ongoing', 'not_open', 'unknown');
/**
 * @useDeclaredType
 * @category Daily Notes
 */
export type TeyvatArchonQuestStatus = typeof schemaTeyvatArchonQuestStatus.infer;

const schemaTeyvatAccountDailyNotesResource = type({
	current: 'number.integer',
	maximum: 'number.integer',
	fullyRecoveredAt: 'Date',
});
const schemaTeyvatAccountExpedition = type({
	characterIcon: 'string',
	status: schemaTeyvatExpeditionStatus,
	completesAt: 'Date',
});
const schemaTeyvatAccountTransformer = type({
	obtained: 'boolean',
	availableAt: 'Date | null',
});
const schemaTeyvatAccountTaskReward = type({
	status: schemaTeyvatTaskRewardStatus,
});
const schemaTeyvatAccountAttendanceReward = type({
	status: schemaTeyvatAttendanceRewardStatus,
	progress: 'number.integer',
});
const schemaTeyvatAccountDailyTasks = type({
	completed: 'number.integer',
	total: 'number.integer',
	rewardClaimed: 'boolean',
	taskRewards: schemaTeyvatAccountTaskReward.array(),
	attendance: {
		visible: 'boolean',
		stored: 'number',
		refreshesAt: 'Date | null',
		rewards: schemaTeyvatAccountAttendanceReward.array(),
	},
});
const schemaTeyvatAccountArchonQuest = type({
	id: 'number.integer',
	status: schemaTeyvatArchonQuestStatus,
	chapterNumber: 'string',
	title: 'string',
});
const schemaTeyvatAccountArchonQuestProgress = type({
	quests: schemaTeyvatAccountArchonQuest.array(),
	allMainlinesFinished: 'boolean',
	unlocked: 'boolean',
	allInterchaptersFinished: 'boolean',
});
export const schemaTeyvatAccountDailyNotes = type({
	resin: schemaTeyvatAccountDailyNotesResource,
	realmCurrency: schemaTeyvatAccountDailyNotesResource,
	commissions: {
		completed: 'number.integer',
		total: 'number.integer',
		rewardClaimed: 'boolean',
	},
	weeklyBossDiscounts: {
		remaining: 'number.integer',
		limit: 'number.integer',
	},
	expeditions: {
		maximum: 'number.integer',
		items: schemaTeyvatAccountExpedition.array(),
	},
	transformer: schemaTeyvatAccountTransformer,
	dailyTasks: schemaTeyvatAccountDailyTasks,
	archonQuestProgress: schemaTeyvatAccountArchonQuestProgress,
});
/**
 * @interface
 * @useDeclaredType
 * @category Daily Notes
 */
export type TeyvatAccountDailyNotes = typeof schemaTeyvatAccountDailyNotes.infer;
