/** @category Characters */
export type {
	TeyvatAccountCharacter,
	TeyvatCharacterElement,
	TeyvatCharactersOptions,
	TeyvatWeaponType,
} from './character.ts';
/** @category Daily Notes */
export type {
	TeyvatAccountDailyNotes,
	TeyvatArchonQuestStatus,
	TeyvatAttendanceRewardStatus,
	TeyvatDailyNotesOptions,
	TeyvatExpeditionStatus,
	TeyvatTaskRewardStatus,
} from './daily_notes.ts';
/** @category Imaginarium Theater */
export type {
	TeyvatAccountImaginariumTheater,
	TeyvatImaginariumTheaterCharacterRole,
	TeyvatImaginariumTheaterDifficulty,
	TeyvatImaginariumTheaterOptions,
} from './imaginarium_theater.ts';
/** @category Account Info */
export type { TeyvatAccountInfo, TeyvatAccountInfoOptions } from './info.ts';
/** @category Inventory */
export type { TeyvatAccountInventory } from './inventory.ts';
/** @category Account Info */
export type { TeyvatServer } from './server.ts';
/** @category Spiral Abyss */
export type {
	TeyvatAccountSpiralAbyss,
	TeyvatSpiralAbyssHalf,
	TeyvatSpiralAbyssOptions,
	TeyvatSpiralAbyssPeriod,
} from './spiral_abyss.ts';
/** @category Stygian Onslaught */
export type { TeyvatAccountStygianOnslaught, TeyvatStygianOnslaughtOptions } from './stygian_onslaught.ts';

/** @category Core */
export interface TeyvatAccountsOptions {
	update?: boolean;
}
