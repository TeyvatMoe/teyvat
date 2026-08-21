import type { TeyvatCookies } from './cookies.ts';
import type { TeyvatLanguage } from './language.ts';

export * from './account/index.ts';
/** @category Authentication */
export type {
	TeyvatAuthCaptcha,
	TeyvatAuthCaptchaSolution,
	TeyvatAuthOptions,
	TeyvatAuthResult,
	TeyvatAuthSession,
} from './auth.ts';
/** @category Authentication */
export type { TeyvatCookies } from './cookies.ts';
/** @category Core */
export type { TeyvatLanguage } from './language.ts';
export type { TeyvatPaginator } from './paginator.ts';
/** @category Transaction History */
export type {
	TeyvatTransaction,
	TeyvatTransactionOptions,
	TeyvatTransactionType,
} from './transactions.ts';
/** @category Wish History */
export type {
	TeyvatWish,
	TeyvatWishBannerType,
	TeyvatWishClient,
	TeyvatWishesOptions,
	TeyvatWishHistoryOptions,
	TeyvatWishItemType,
} from './wishes.ts';

/** @category Authentication */
export interface TeyvatCookiesUpdate {
	hoyolab_id: string;
	cookies: TeyvatCookies;
}

/** @category Core */
export interface TeyvatOptions {
	cookies?: TeyvatCookies | string;
	language?: TeyvatLanguage;
	hoyolab_id?: string;
	on_cookies_update?: (update: TeyvatCookiesUpdate) => Promise<void> | void;
	accounts_cache_ttl?: number;
}
