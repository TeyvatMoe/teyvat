import type { TeyvatCookies } from './cookies.ts';

export * from './account/index.ts';
/** @category Authentication */
export type {
	TeyvatAuthCaptcha,
	TeyvatAuthCaptchaRequired,
	TeyvatAuthCaptchaSolution,
	TeyvatAuthCaptchaSolutionV3,
	TeyvatAuthCaptchaSolutionV4,
	TeyvatAuthCaptchaV3,
	TeyvatAuthCaptchaV4,
	TeyvatAuthEmailVerificationRequired,
	TeyvatAuthenticated,
	TeyvatAuthOptions,
	TeyvatAuthResult,
	TeyvatAuthSession,
} from './auth.ts';
/** @category Authentication */
export type { TeyvatCookies } from './cookies.ts';

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
