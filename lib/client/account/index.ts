import type { Teyvat } from '#/client/teyvat.ts';
import type { TeyvatAccountAchievements } from '#/types/account/achievements.ts';
import type { TeyvatCalculatorClient } from '#/types/account/calculator.ts';
import type { TeyvatAccountCalendar } from '#/types/account/calendar.ts';
import type { TeyvatAccountCharacter, TeyvatCharactersOptions } from '#/types/account/character.ts';
import type { TeyvatCodeRedemptionResult } from '#/types/account/code_redemption.ts';
import type { TeyvatAccountDailyNotes } from '#/types/account/daily_notes.ts';
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
import { _recognize_genshin_server } from '#/utils/uid.ts';
import { _get_account_achievements } from './achievements.ts';
import { _TeyvatCalculatorClient } from './calculator.ts';
import { _get_account_calendar } from './calendar.ts';
import { _get_account_characters } from './characters.ts';
import { _redeem_account_code } from './code_redemption.ts';
import { _get_account_daily_notes } from './daily_notes.ts';
import { _get_account_imaginarium_theater } from './imaginarium_theater.ts';
import { _get_account_info } from './info.ts';
import { _get_account_inventory } from './inventory.ts';
import { _get_account_showcase, _set_account_showcase } from './showcase.ts';
import { _get_account_spiral_abyss } from './spiral_abyss.ts';
import { _get_account_stygian_onslaught } from './stygian_onslaught.ts';
import { _get_account_traveler_diary, _get_account_traveler_diary_log } from './traveler_diary.ts';

interface TeyvatAccountDetails {
	nickname: string;
	server_name: string;
	level: number;
	is_selected: boolean;
	is_official: boolean;
}

const account_details = new WeakMap<TeyvatAccount, TeyvatAccountDetails>();

/** @category Core */
export class TeyvatAccount {
	readonly inst: Teyvat;
	readonly uid: number;
	readonly server: TeyvatServer;
	readonly calculator: TeyvatCalculatorClient;

	constructor(inst: Teyvat, uid: number) {
		this.inst = inst;
		this.uid = uid;
		this.server = _recognize_genshin_server(uid);
		this.calculator = new _TeyvatCalculatorClient(this);
	}

	get nickname(): string | undefined {
		return account_details.get(this)?.nickname;
	}

	get server_name(): string | undefined {
		return account_details.get(this)?.server_name;
	}

	get level(): number | undefined {
		return account_details.get(this)?.level;
	}

	get is_selected(): boolean | undefined {
		return account_details.get(this)?.is_selected;
	}

	get is_official(): boolean | undefined {
		return account_details.get(this)?.is_official;
	}

	async info(): Promise<TeyvatAccountInfo> {
		return await _get_account_info(this);
	}

	async achievements(): Promise<TeyvatAccountAchievements> {
		return await _get_account_achievements(this);
	}

	async inventory(): Promise<TeyvatAccountInventory> {
		return await _get_account_inventory(this);
	}

	async imaginarium_theater(): Promise<TeyvatAccountImaginariumTheater> {
		return await _get_account_imaginarium_theater(this);
	}

	async daily_notes(): Promise<TeyvatAccountDailyNotes> {
		return await _get_account_daily_notes(this);
	}

	async characters(options?: TeyvatCharactersOptions): Promise<TeyvatAccountCharacter[]> {
		return await _get_account_characters(this, options);
	}

	async showcase(): Promise<TeyvatAccountShowcaseCharacter[]> {
		return await _get_account_showcase(this);
	}

	async set_showcase(character_ids: number[]): Promise<TeyvatAccountShowcaseCharacter[]> {
		return await _set_account_showcase(this, character_ids);
	}

	async redeem_code(code: string): Promise<TeyvatCodeRedemptionResult> {
		return await _redeem_account_code(this, code);
	}

	async calendar(): Promise<TeyvatAccountCalendar> {
		return await _get_account_calendar(this);
	}

	async spiral_abyss(options?: TeyvatSpiralAbyssOptions): Promise<TeyvatAccountSpiralAbyss> {
		return await _get_account_spiral_abyss(this, options);
	}

	async stygian_onslaught(): Promise<TeyvatAccountStygianOnslaught[]> {
		return await _get_account_stygian_onslaught(this);
	}

	async traveler_diary(options?: TeyvatTravelerDiaryOptions): Promise<TeyvatAccountTravelerDiary> {
		return await _get_account_traveler_diary(this, options);
	}

	traveler_diary_log(options?: TeyvatTravelerDiaryLogOptions): TeyvatPaginator<TeyvatTravelerDiaryEntry> {
		return _get_account_traveler_diary_log(this, options);
	}
}

export function _set_account_details(account: TeyvatAccount, details: TeyvatAccountDetails): void {
	account_details.set(account, details);
}
