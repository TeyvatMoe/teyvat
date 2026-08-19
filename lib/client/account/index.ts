import type { TeyvatAccountInfo } from '../../types/account/info.ts';
import type { TeyvatServer } from '../../types/account/server.ts';
import { _recognize_genshin_server } from '../../utils/uid.ts';
import type { Teyvat } from '../teyvat.ts';
import { _get_account_info } from './info.ts';

interface TeyvatAccountDetails {
	nickname: string;
	serverName: string;
	level: number;
	isSelected: boolean;
	isOfficial: boolean;
}

const accountDetails = new WeakMap<TeyvatAccount, TeyvatAccountDetails>();

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
		return await _get_account_info(this);
	}

	async characters() {}

	async daily_notes() {}

	async spiral_abyss() {}
}

export function _set_account_details(account: TeyvatAccount, details: TeyvatAccountDetails): void {
	accountDetails.set(account, details);
}
