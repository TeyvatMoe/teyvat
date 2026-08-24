import type { TeyvatCookies } from './cookies.ts';
import type { TeyvatLanguage } from './language.ts';

export type {
	TeyvatAccountAchievements,
	TeyvatAccountCalendar,
	TeyvatAccountCharacter,
	TeyvatAccountDailyNotes,
	TeyvatAccountEnvisagedEcho,
	TeyvatAccountImaginariumTheater,
	TeyvatAccountInfo,
	TeyvatAccountInventory,
	TeyvatAccountShowcaseCharacter,
	TeyvatAccountSpiralAbyss,
	TeyvatAccountStygianOnslaught,
	TeyvatAccountsOptions,
	TeyvatAccountTravelerDiary,
	TeyvatArchonQuestStatus,
	TeyvatAttendanceRewardStatus,
	TeyvatCalculatorCharacter,
	TeyvatCalculatorCharacterDetails,
	TeyvatCalculatorClient,
	TeyvatCalculatorOptions,
	TeyvatCalculatorResult,
	TeyvatCalendarElement,
	TeyvatCalendarStatus,
	TeyvatCharacterElement,
	TeyvatCharactersOptions,
	TeyvatCodeRedemptionResult,
	TeyvatEnvisagedEchoStatus,
	TeyvatExpeditionStatus,
	TeyvatImaginariumTheaterCharacterRole,
	TeyvatImaginariumTheaterDifficulty,
	TeyvatServer,
	TeyvatSpiralAbyssHalf,
	TeyvatSpiralAbyssOptions,
	TeyvatSpiralAbyssPeriod,
	TeyvatTaskRewardStatus,
	TeyvatTravelerDiaryCurrency,
	TeyvatTravelerDiaryEntry,
	TeyvatTravelerDiaryLogOptions,
	TeyvatTravelerDiaryOptions,
	TeyvatWeaponType,
} from './account/index.ts';
/** @category Authentication */
export type {
	TeyvatAuthCaptcha,
	TeyvatAuthCaptchaSolution,
	TeyvatAuthOptions,
	TeyvatAuthResult,
	TeyvatAuthSession,
} from './auth.ts';
/** @category Daily Check-In */
export type {
	TeyvatCheckInCaptchaSolution,
	TeyvatCheckInClaimOptions,
	TeyvatCheckInClient,
	TeyvatCheckInHistoryEntry,
	TeyvatCheckInHistoryOptions,
	TeyvatCheckInInfo,
	TeyvatCheckInResult,
} from './check_in.ts';
/** @category Authentication */
export type { TeyvatCookies } from './cookies.ts';
/** @category Core */
export type { TeyvatLanguage } from './language.ts';
export type { TeyvatPaginator } from './paginator.ts';
/** @category HoYoLAB Profile */
export type { TeyvatProfile, TeyvatProfileGender, TeyvatProfileOptions } from './profile.ts';
/** @category Transaction History */
export type {
	TeyvatTransaction,
	TeyvatTransactionOptions,
	TeyvatTransactionType,
} from './transactions.ts';
/** @category Wish History */
export type {
	TeyvatWish,
	TeyvatWishBannerType,
	TeyvatWishClient,
	TeyvatWishesOptions,
	TeyvatWishHistoryOptions,
	TeyvatWishItemType,
} from './wishes.ts';

/** @category Authentication */
export interface TeyvatCookiesUpdate {
	hoyolabId: string;
	cookies: TeyvatCookies;
}

/** @category Core */
export interface TeyvatOptions {
	cookies: TeyvatCookies | string;
	language?: TeyvatLanguage;
	autoEnable?: boolean;
	hoyolabId?: string;
	onCookiesUpdate?: (update: TeyvatCookiesUpdate) => Promise<void> | void;
	accountsCacheTtl?: number;
}
