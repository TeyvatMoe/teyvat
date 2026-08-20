import type { TeyvatCookies } from './cookies.ts';

export * from './account/index.ts';
export * from './cookies.ts';

export interface TeyvatOptions {
	cookies?: TeyvatCookies | string;
	accounts_cache_ttl?: number;
}
