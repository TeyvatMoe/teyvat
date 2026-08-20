import type { TeyvatAccountCharacter, TeyvatCharactersOptions } from '../../types/account/character.ts';
import type { TeyvatAccountDailyNotes, TeyvatDailyNotesOptions } from '../../types/account/daily_notes.ts';
import type { TeyvatAccountInfo } from '../../types/account/info.ts';
import type { TeyvatServer } from '../../types/account/server.ts';
import type { TeyvatAccountSpiralAbyss, TeyvatSpiralAbyssOptions } from '../../types/account/spiral_abyss.ts';
import { _recognize_genshin_server } from '../../utils/uid.ts';
import type { Teyvat } from '../teyvat.ts';
import { _get_account_characters } from './characters.ts';
import { _get_account_daily_notes } from './daily_notes.ts';
import { _get_account_info } from './info.ts';
import { _get_account_spiral_abyss } from './spiral_abyss.ts';

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

	async info(): Promise<TeyvatAccountInfo> {
		return await _get_account_info(this);
	}

	async daily_notes(options?: TeyvatDailyNotesOptions): Promise<TeyvatAccountDailyNotes> {
		return await _get_account_daily_notes(this, options);
	}

	async characters(options?: TeyvatCharactersOptions): Promise<TeyvatAccountCharacter[]> {
		return await _get_account_characters(this, options);
	}

	async spiral_abyss(options?: TeyvatSpiralAbyssOptions): Promise<TeyvatAccountSpiralAbyss> {
		return await _get_account_spiral_abyss(this, options);
	}
}

export function _set_account_details(account: TeyvatAccount, details: TeyvatAccountDetails): void {
	account_details.set(account, details);
}
