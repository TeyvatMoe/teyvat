import type { TeyvatCookies } from '../types/index.ts';
import { _parse_cookies } from '../utils/cookies.ts';
import { TeyvatAccount } from './account.ts';
import { TeyvatError } from './errors.ts';

export interface TeyvatOptions {
	cookies?: TeyvatCookies | string;
}

export class Teyvat {
	cookies?: TeyvatCookies;

	_accounts = new Map<number, TeyvatAccount>();

	constructor(opts: TeyvatOptions) {
		if (!opts.cookies) throw new TeyvatError('missing cookies');
		this.cookies = typeof opts.cookies !== 'string' ? opts.cookies : _parse_cookies(opts.cookies);
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
