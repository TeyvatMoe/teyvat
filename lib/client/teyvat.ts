import type { TeyvatCookies } from '../types/index.ts';
import { _parse_cookies } from '../utils/cookies.ts';
import { TeyvatAccount } from './account.ts';
import { TeyvatError } from './errors.ts';
import { getHttpClient, initializeHttpClient } from './request.ts';

export interface TeyvatOptions {
	cookies?: TeyvatCookies | string;
}

export class Teyvat {
	_accounts = new Map<number, TeyvatAccount>();

	constructor(opts: TeyvatOptions) {
		if (!opts.cookies) throw new TeyvatError('missing cookies');
		initializeHttpClient(this, _parse_cookies(opts.cookies));
	}

	get cookies(): TeyvatCookies {
		return getHttpClient(this).cookies.toJSON();
	}

	async accounts(): Promise<Array<TeyvatAccount>> {
		return [...this._accounts.values()];
	}

	account(uid: number) {
		const account = this._accounts.get(uid) ?? new TeyvatAccount(this, uid);
		if (!this._accounts.has(uid)) this._accounts.set(uid, account);
		return account;
	}
}
