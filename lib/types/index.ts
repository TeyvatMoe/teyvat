import type { TeyvatCookies } from './cookies.ts';

export * from './account/index.ts';
export * from './auth.ts';
export * from './cookies.ts';

export interface TeyvatCookiesUpdate {
	hoyolab_id: string;
	cookies: TeyvatCookies;
}

export interface TeyvatOptions {
	cookies?: TeyvatCookies | string;
	hoyolab_id?: string;
	on_cookies_update?: (update: TeyvatCookiesUpdate) => Promise<void> | void;
	accounts_cache_ttl?: number;
}
