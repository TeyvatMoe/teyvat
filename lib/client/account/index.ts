import type { Teyvat } from '#/client/teyvat.ts';
import type { TeyvatAccountAchievements } from '#/types/account/achievements.ts';
import type { TeyvatCalculatorClient } from '#/types/account/calculator.ts';
import type { TeyvatAccountCalendar } from '#/types/account/calendar.ts';
import type { TeyvatAccountCharacter, TeyvatCharactersOptions } from '#/types/account/character.ts';
import type { TeyvatCodeRedemptionResult } from '#/types/account/code_redemption.ts';
import type { TeyvatAccountDailyNotes } from '#/types/account/daily_notes.ts';
import type { TeyvatAccountEnvisagedEcho } from '#/types/account/envisaged_echoes.ts';
import type { TeyvatAccountImaginariumTheater } from '#/types/account/imaginarium_theater.ts';
import type { TeyvatAccountInfo } from '#/types/account/info.ts';
import type { TeyvatAccountInventory } from '#/types/account/inventory.ts';
import type { TeyvatServer } from '#/types/account/server.ts';
import type { TeyvatAccountShowcaseCharacter } from '#/types/account/showcase.ts';
import type { TeyvatAccountSpiralAbyss, TeyvatSpiralAbyssOptions } from '#/types/account/spiral_abyss.ts';
import type { TeyvatAccountStygianOnslaught } from '#/types/account/stygian_onslaught.ts';
import type {
	TeyvatAccountTravelerDiary,
	TeyvatTravelerDiaryEntry,
	TeyvatTravelerDiaryLogOptions,
	TeyvatTravelerDiaryOptions,
} from '#/types/account/traveler_diary.ts';
import type { TeyvatPaginator } from '#/types/paginator.ts';
import { _recognizeGenshinServer } from '#/utils/uid.ts';
import { _getAccountAchievements } from './achievements.ts';
import { _TeyvatCalculatorClient } from './calculator.ts';
import { _getAccountCalendar } from './calendar.ts';
import { _getAccountCharacters } from './characters.ts';
import { _redeemAccountCode } from './code_redemption.ts';
import { _getAccountDailyNotes } from './daily_notes.ts';
import { _getAccountEnvisagedEchoes } from './envisaged_echoes.ts';
import { _getAccountImaginariumTheater } from './imaginarium_theater.ts';
import { _getAccountInfo } from './info.ts';
import { _getAccountInventory } from './inventory.ts';
import { _getAccountShowcase, _setAccountShowcase } from './showcase.ts';
import { _getAccountSpiralAbyss } from './spiral_abyss.ts';
import { _getAccountStygianOnslaught } from './stygian_onslaught.ts';
import { _getAccountTravelerDiary, _getAccountTravelerDiaryLog } from './traveler_diary.ts';

interface TeyvatAccountDetails {
	nickname: string;
	serverName: string;
	level: number;
	isSelected: boolean;
	isOfficial: boolean;
}

const accountDetails = new WeakMap<TeyvatAccount, TeyvatAccountDetails>();

/** @category Core */
export class TeyvatAccount {
	readonly inst: Teyvat;
	readonly uid: number;
	readonly server: TeyvatServer;
	readonly calculator: TeyvatCalculatorClient;

	constructor(inst: Teyvat, uid: number) {
		this.inst = inst;
		this.uid = uid;
		this.server = _recognizeGenshinServer(uid);
		this.calculator = new _TeyvatCalculatorClient(this);
	}

	get nickname(): string | undefined {
		return accountDetails.get(this)?.nickname;
	}

	get serverName(): string | undefined {
		return accountDetails.get(this)?.serverName;
	}

	get level(): number | undefined {
		return accountDetails.get(this)?.level;
	}

	get isSelected(): boolean | undefined {
		return accountDetails.get(this)?.isSelected;
	}

	get isOfficial(): boolean | undefined {
		return accountDetails.get(this)?.isOfficial;
	}

	async info(): Promise<TeyvatAccountInfo> {
		return await _getAccountInfo(this);
	}

	async achievements(): Promise<TeyvatAccountAchievements> {
		return await _getAccountAchievements(this);
	}

	async inventory(): Promise<TeyvatAccountInventory> {
		return await _getAccountInventory(this);
	}

	async imaginariumTheater(): Promise<TeyvatAccountImaginariumTheater> {
		return await _getAccountImaginariumTheater(this);
	}

	async dailyNotes(): Promise<TeyvatAccountDailyNotes> {
		return await _getAccountDailyNotes(this);
	}

	async envisagedEchoes(): Promise<TeyvatAccountEnvisagedEcho[]> {
		return await _getAccountEnvisagedEchoes(this);
	}

	async characters(options?: TeyvatCharactersOptions): Promise<TeyvatAccountCharacter[]> {
		return await _getAccountCharacters(this, options);
	}

	async showcase(): Promise<TeyvatAccountShowcaseCharacter[]> {
		return await _getAccountShowcase(this);
	}

	async setShowcase(characterIds: number[]): Promise<TeyvatAccountShowcaseCharacter[]> {
		return await _setAccountShowcase(this, characterIds);
	}

	async redeemCode(code: string): Promise<TeyvatCodeRedemptionResult> {
		return await _redeemAccountCode(this, code);
	}

	async calendar(): Promise<TeyvatAccountCalendar> {
		return await _getAccountCalendar(this);
	}

	async spiralAbyss(options?: TeyvatSpiralAbyssOptions): Promise<TeyvatAccountSpiralAbyss> {
		return await _getAccountSpiralAbyss(this, options);
	}

	async stygianOnslaught(): Promise<TeyvatAccountStygianOnslaught[]> {
		return await _getAccountStygianOnslaught(this);
	}

	async travelerDiary(options?: TeyvatTravelerDiaryOptions): Promise<TeyvatAccountTravelerDiary> {
		return await _getAccountTravelerDiary(this, options);
	}

	travelerDiaryLog(options?: TeyvatTravelerDiaryLogOptions): TeyvatPaginator<TeyvatTravelerDiaryEntry> {
		return _getAccountTravelerDiaryLog(this, options);
	}
}

export function _setAccountDetails(account: TeyvatAccount, details: TeyvatAccountDetails): void {
	accountDetails.set(account, details);
}
