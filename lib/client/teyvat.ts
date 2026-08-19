import type { TeyvatCookies } from '../types/index.ts';
import { _parse_cookies } from '../utils/cookies.ts';
import { _recognize_genshin_server } from '../utils/uid.ts';
import { TeyvatAccount } from './account/index.ts';
import { _get_accounts } from './accounts.ts';
import { TeyvatError } from './errors.ts';
import { _get_http_client, _initialize_http_client } from './request.ts';

export interface TeyvatOptions {
	cookies?: TeyvatCookies | string;
}

export class Teyvat {
	_accounts = new Map<number, TeyvatAccount>();
	#accounts_request?: Promise<Array<TeyvatAccount>>;

	constructor(opts: TeyvatOptions) {
		if (!opts.cookies) throw new TeyvatError('missing cookies');
		_initialize_http_client(this, _parse_cookies(opts.cookies));
	}

	get cookies(): TeyvatCookies {
		return _get_http_client(this).cookies.to_json();
	}

	async accounts(): Promise<Array<TeyvatAccount>> {
		this.#accounts_request ??= _get_accounts(this).catch((error: unknown) => {
			this.#accounts_request = undefined;
			throw error;
		});
		return await this.#accounts_request;
	}

	account(uid: number): TeyvatAccount {
		_recognize_genshin_server(uid);
		const account = this._accounts.get(uid) ?? new TeyvatAccount(this, uid);
		if (!this._accounts.has(uid)) this._accounts.set(uid, account);
		return account;
	}
}
