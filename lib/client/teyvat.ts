import type { TeyvatCookies } from '../types/index.ts';
import { _parse_cookies } from '../utils/cookies.ts';
import { _recognize_genshin_server } from '../utils/uid.ts';
import { TeyvatAccount } from './account/index.ts';
import { _get_accounts } from './accounts.ts';
import { TeyvatError } from './errors.ts';
import { getHttpClient, initializeHttpClient } from './request.ts';

export interface TeyvatOptions {
	cookies?: TeyvatCookies | string;
}

export class Teyvat {
	_accounts = new Map<number, TeyvatAccount>();
	#accountsRequest?: Promise<Array<TeyvatAccount>>;

	constructor(opts: TeyvatOptions) {
		if (!opts.cookies) throw new TeyvatError('missing cookies');
		initializeHttpClient(this, _parse_cookies(opts.cookies));
	}

	get cookies(): TeyvatCookies {
		return getHttpClient(this).cookies.toJSON();
	}

	async accounts(): Promise<Array<TeyvatAccount>> {
		this.#accountsRequest ??= _get_accounts(this).catch((error: unknown) => {
			this.#accountsRequest = undefined;
			throw error;
		});
		return await this.#accountsRequest;
	}

	account(uid: number): TeyvatAccount {
		_recognize_genshin_server(uid);
		const account = this._accounts.get(uid) ?? new TeyvatAccount(this, uid);
		if (!this._accounts.has(uid)) this._accounts.set(uid, account);
		return account;
	}
}
