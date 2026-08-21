import type { Teyvat } from '#/client/teyvat.ts';
import type { TeyvatAccountCalendar, TeyvatCalendarOptions } from '#/types/account/calendar.ts';
import type { TeyvatAccountCharacter, TeyvatCharactersOptions } from '#/types/account/character.ts';
import type { TeyvatCodeRedemptionResult } from '#/types/account/code_redemption.ts';
import type { TeyvatAccountDailyNotes, TeyvatDailyNotesOptions } from '#/types/account/daily_notes.ts';
import type {
	TeyvatAccountImaginariumTheater,
	TeyvatImaginariumTheaterOptions,
} from '#/types/account/imaginarium_theater.ts';
import type { TeyvatAccountInfo, TeyvatAccountInfoOptions } from '#/types/account/info.ts';
import type { TeyvatAccountInventory } from '#/types/account/inventory.ts';
import type { TeyvatServer } from '#/types/account/server.ts';
import type { TeyvatAccountSpiralAbyss, TeyvatSpiralAbyssOptions } from '#/types/account/spiral_abyss.ts';
import type {
	TeyvatAccountStygianOnslaught,
	TeyvatStygianOnslaughtOptions,
} from '#/types/account/stygian_onslaught.ts';
import type {
	TeyvatAccountTravelerDiary,
	TeyvatTravelerDiaryEntry,
	TeyvatTravelerDiaryLogOptions,
	TeyvatTravelerDiaryOptions,
} from '#/types/account/traveler_diary.ts';
import type { TeyvatPaginator } from '#/types/paginator.ts';
import { _recognize_genshin_server } from '#/utils/uid.ts';
import { _get_account_calendar } from './calendar.ts';
import { _get_account_characters } from './characters.ts';
import { _redeem_account_code } from './code_redemption.ts';
import { _get_account_daily_notes } from './daily_notes.ts';
import { _get_account_imaginarium_theater } from './imaginarium_theater.ts';
import { _get_account_info } from './info.ts';
import { _get_account_inventory } from './inventory.ts';
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

	constructor(inst: Teyvat, uid: number) {
		this.inst = inst;
		this.uid = uid;
		this.server = _recognize_genshin_server(uid);
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

	async info(options?: TeyvatAccountInfoOptions): Promise<TeyvatAccountInfo> {
		return await _get_account_info(this, options);
	}

	async inventory(): Promise<TeyvatAccountInventory> {
		return await _get_account_inventory(this);
	}

	async imaginarium_theater(options?: TeyvatImaginariumTheaterOptions): Promise<TeyvatAccountImaginariumTheater> {
		return await _get_account_imaginarium_theater(this, options);
	}

	async daily_notes(options?: TeyvatDailyNotesOptions): Promise<TeyvatAccountDailyNotes> {
		return await _get_account_daily_notes(this, options);
	}

	async characters(options?: TeyvatCharactersOptions): Promise<TeyvatAccountCharacter[]> {
		return await _get_account_characters(this, options);
	}

	async redeem_code(code: string): Promise<TeyvatCodeRedemptionResult> {
		return await _redeem_account_code(this, code);
	}

	async calendar(options?: TeyvatCalendarOptions): Promise<TeyvatAccountCalendar> {
		return await _get_account_calendar(this, options);
	}

	async spiral_abyss(options?: TeyvatSpiralAbyssOptions): Promise<TeyvatAccountSpiralAbyss> {
		return await _get_account_spiral_abyss(this, options);
	}

	async stygian_onslaught(options?: TeyvatStygianOnslaughtOptions): Promise<TeyvatAccountStygianOnslaught[]> {
		return await _get_account_stygian_onslaught(this, options);
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
