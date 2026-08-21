import type { TeyvatCookies } from './cookies.ts';

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
export type { TeyvatPaginator } from './paginator.ts';
/** @category Wish History */
export type {
	TeyvatWish,
	TeyvatWishBannerType,
	TeyvatWishClient,
	TeyvatWishHistoryOptions,
	TeyvatWishItemType,
	TeyvatWishesOptions,
} from './wishes.ts';

/** @category Authentication */
export interface TeyvatCookiesUpdate {
	hoyolab_id: string;
	cookies: TeyvatCookies;
}

/** @category Core */
export interface TeyvatOptions {
	cookies?: TeyvatCookies | string;
	hoyolab_id?: string;
	on_cookies_update?: (update: TeyvatCookiesUpdate) => Promise<void> | void;
	accounts_cache_ttl?: number;
}
