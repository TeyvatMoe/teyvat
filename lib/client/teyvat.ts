import { _hoyolab_complete_cookies } from '../endpoints/hoyolab/auth.ts';
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
} from '../types/index.ts';
import { _hoyolab_id_from_cookies, _parse_cookies } from '../utils/cookies.ts';
import { _recognize_genshin_server } from '../utils/uid.ts';
import { TeyvatAccount } from './account/index.ts';
import { _get_accounts } from './accounts.ts';
import { _TeyvatAuthSession } from './auth.ts';
import { _TeyvatCheckInClient } from './check_in.ts';
import { TeyvatError } from './errors.ts';
import { _get_http_client, _initialize_http_client } from './request.ts';
import { _TeyvatWishClient } from './wishes.ts';

/** @category Core */
export class Teyvat {
	#accounts = new Map<number, TeyvatAccount>();
	#accounts_cache?: Array<TeyvatAccount>;
	#accounts_cache_updated_at = 0;
	#accounts_refresh?: Promise<Array<TeyvatAccount>>;
	readonly #accounts_cache_ttl: number;
	#cookies_completion?: Promise<boolean>;
	readonly hoyolab_id: string;
	readonly language: TeyvatLanguage;
	readonly check_in: TeyvatCheckInClient;

	static auth(options: TeyvatAuthOptions): TeyvatAuthSession {
		return new _TeyvatAuthSession(options);
	}

	static wishes(options: TeyvatWishesOptions): TeyvatWishClient {
		return new _TeyvatWishClient(options);
	}

	constructor(opts: TeyvatOptions) {
		if (!opts.cookies) throw new TeyvatError('missing cookies');
		const cookies = _parse_cookies(opts.cookies);
		this.hoyolab_id = _hoyolab_id_from_cookies(cookies, opts.hoyolab_id);
		if (
			opts.accounts_cache_ttl !== undefined &&
			(!Number.isFinite(opts.accounts_cache_ttl) || opts.accounts_cache_ttl < 0)
		) {
			throw new TeyvatError('accounts_cache_ttl must be a finite, nonnegative number');
		}
		this.#accounts_cache_ttl = opts.accounts_cache_ttl ?? 3_600_000;
		_initialize_http_client(this, cookies, {
			language: opts.language,
			prepare_auth: async () => {
				await this.#complete_cookies(false);
			},
			repair_auth: async () => await this.#complete_cookies(true),
			on_cookies_update: async (updated_cookies) => {
				_hoyolab_id_from_cookies(updated_cookies, this.hoyolab_id);
				await opts.on_cookies_update?.({ hoyolab_id: this.hoyolab_id, cookies: updated_cookies });
			},
		});
		this.language = _get_http_client(this).language;
		this.check_in = new _TeyvatCheckInClient(this);
	}

	get cookies(): TeyvatCookies {
		return _get_http_client(this).cookies.to_json();
	}

	async accounts(options: TeyvatAccountsOptions = {}): Promise<Array<TeyvatAccount>> {
		if (!this.#accounts_cache || options.update) return await this.#refresh_accounts();

		if (Date.now() - this.#accounts_cache_updated_at >= this.#accounts_cache_ttl) {
			void this.#refresh_accounts().catch(() => undefined);
		}

		return [...this.#accounts_cache];
	}

	account(uid: number): TeyvatAccount {
		_recognize_genshin_server(uid);
		const account = this.#accounts.get(uid) ?? new TeyvatAccount(this, uid);
		if (!this.#accounts.has(uid)) this.#accounts.set(uid, account);
		return account;
	}

	#refresh_accounts(): Promise<Array<TeyvatAccount>> {
		if (this.#accounts_refresh) return this.#accounts_refresh;

		const refresh = _get_accounts(this)
			.then((accounts) => {
				this.#accounts_cache = [...accounts];
				this.#accounts_cache_updated_at = Date.now();
				return [...accounts];
			})
			.finally(() => {
				if (this.#accounts_refresh === refresh) this.#accounts_refresh = undefined;
			});
		this.#accounts_refresh = refresh;
		return refresh;
	}

	async #complete_cookies(force: boolean): Promise<boolean> {
		const client = _get_http_client(this);
		if (!client.cookies.has('stoken')) return false;
		if (!force && client.cookies.has('ltoken_v2') && client.cookies.has('cookie_token_v2')) return false;
		if (this.#cookies_completion) return await this.#cookies_completion;

		const completion = (async () => {
			const cookies = await _hoyolab_complete_cookies(client);
			await client.merge_cookies(cookies);
			return true;
		})();
		this.#cookies_completion = completion;
		try {
			return await completion;
		} finally {
			if (this.#cookies_completion === completion) this.#cookies_completion = undefined;
		}
	}
}
