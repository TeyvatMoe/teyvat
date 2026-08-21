import { _hoyolabCompleteCookies } from '#/endpoints/hoyolab/auth.ts';
import type {
	TeyvatAccountsOptions,
	TeyvatAuthOptions,
	TeyvatAuthSession,
	TeyvatCheckInClient,
	TeyvatCookies,
	TeyvatLanguage,
	TeyvatOptions,
	TeyvatWishClient,
	TeyvatWishesOptions,
} from '#/types/index.ts';
import { _hoyolabIdFromCookies, _parseCookies } from '#/utils/cookies.ts';
import { _recognizeGenshinServer } from '#/utils/uid.ts';
import { _createTeyvatAccount, type TeyvatAccount } from './account/index.ts';
import { _getAccounts } from './accounts.ts';
import { _TeyvatAuthSession } from './auth.ts';
import { _TeyvatCheckInClient } from './check_in.ts';
import { TeyvatError } from './errors.ts';
import { _getHttpClient, _initializeHttpClient } from './request.ts';
import { _TeyvatWishClient } from './wishes.ts';

/** @category Core */
export class Teyvat {
	#accounts = new Map<number, TeyvatAccount>();
	#accountsCache?: TeyvatAccount[];
	#accountsCacheUpdatedAt = 0;
	#accountsRefresh?: Promise<TeyvatAccount[]>;
	readonly #accountsCacheTtl: number;
	#cookiesCompletion?: Promise<boolean>;
	readonly hoyolabId: string;
	readonly language: TeyvatLanguage;
	readonly autoEnable: boolean;
	readonly checkIn: TeyvatCheckInClient;

	static auth(options: TeyvatAuthOptions): TeyvatAuthSession {
		return new _TeyvatAuthSession(options);
	}

	static wishes(options: TeyvatWishesOptions): TeyvatWishClient {
		return new _TeyvatWishClient(options);
	}

	constructor(opts: TeyvatOptions) {
		if (!opts.cookies) throw new TeyvatError('missing cookies');
		const cookies = _parseCookies(opts.cookies);
		this.hoyolabId = _hoyolabIdFromCookies(cookies, opts.hoyolabId);
		if (
			opts.accountsCacheTtl !== undefined &&
			(!Number.isFinite(opts.accountsCacheTtl) || opts.accountsCacheTtl < 0)
		) {
			throw new TeyvatError('accountsCacheTtl must be a finite, nonnegative number');
		}
		this.#accountsCacheTtl = opts.accountsCacheTtl ?? 3_600_000;
		this.autoEnable = opts.autoEnable ?? false;
		_initializeHttpClient(this, cookies, {
			language: opts.language,
			prepareAuth: async () => {
				await this.#completeCookies(false);
			},
			repairAuth: async () => await this.#completeCookies(true),
			onCookiesUpdate: async (updatedCookies) => {
				_hoyolabIdFromCookies(updatedCookies, this.hoyolabId);
				await opts.onCookiesUpdate?.({ hoyolabId: this.hoyolabId, cookies: updatedCookies });
			},
		});
		this.language = _getHttpClient(this).language;
		this.checkIn = new _TeyvatCheckInClient(this);
	}

	get cookies(): TeyvatCookies {
		return _getHttpClient(this).cookies.toJson();
	}

	async accounts(options: TeyvatAccountsOptions = {}): Promise<TeyvatAccount[]> {
		if (!this.#accountsCache || options.update) return await this.#refreshAccounts();

		if (Date.now() - this.#accountsCacheUpdatedAt >= this.#accountsCacheTtl) {
			void this.#refreshAccounts().catch(() => undefined);
		}

		return [...this.#accountsCache];
	}

	account(uid: number): TeyvatAccount {
		_recognizeGenshinServer(uid);
		const account = this.#accounts.get(uid) ?? _createTeyvatAccount(this, uid);
		if (!this.#accounts.has(uid)) this.#accounts.set(uid, account);
		return account;
	}

	#refreshAccounts(): Promise<TeyvatAccount[]> {
		if (this.#accountsRefresh) return this.#accountsRefresh;

		const refresh = _getAccounts(this)
			.then((accounts) => {
				this.#accountsCache = [...accounts];
				this.#accountsCacheUpdatedAt = Date.now();
				return [...accounts];
			})
			.finally(() => {
				if (this.#accountsRefresh === refresh) this.#accountsRefresh = undefined;
			});
		this.#accountsRefresh = refresh;
		return refresh;
	}

	async #completeCookies(force: boolean): Promise<boolean> {
		const client = _getHttpClient(this);
		if (!client.cookies.has('stoken')) return false;
		if (!force && client.cookies.has('ltoken_v2') && client.cookies.has('cookie_token_v2')) return false;
		if (this.#cookiesCompletion) return await this.#cookiesCompletion;

		const completion = (async () => {
			const cookies = await _hoyolabCompleteCookies(client);
			await client.mergeCookies(cookies);
			return true;
		})();
		this.#cookiesCompletion = completion;
		try {
			return await completion;
		} finally {
			if (this.#cookiesCompletion === completion) this.#cookiesCompletion = undefined;
		}
	}
}
