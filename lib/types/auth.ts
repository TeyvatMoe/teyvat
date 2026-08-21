import { type } from 'arktype';
import { schemaTeyvatCookies } from './cookies.ts';
import type { TeyvatLanguage } from './language.ts';

const schemaTeyvatAuthCaptchaV3 = type({
	version: "'v3'",
	gt: 'string',
	challenge: 'string',
	newCaptcha: 'number.integer',
	success: 'number.integer',
});
const schemaTeyvatAuthCaptchaV4 = type({
	version: "'v4'",
	captchaId: 'string',
	riskType: 'string',
	sessionId: 'string',
	newCaptcha: 'number.integer',
	success: 'number.integer',
});
const schemaTeyvatAuthCaptcha = schemaTeyvatAuthCaptchaV3.or(schemaTeyvatAuthCaptchaV4);
/**
 * @useDeclaredType
 * @category Authentication
 */
export type TeyvatAuthCaptcha = typeof schemaTeyvatAuthCaptcha.infer;

const schemaTeyvatAuthCaptchaSolutionV3 = type({
	version: "'v3'",
	geetestChallenge: 'string',
	geetestValidate: 'string',
	geetestSeccode: 'string',
});
const schemaTeyvatAuthCaptchaSolutionV4 = type({
	version: "'v4'",
	captchaId: 'string',
	lotNumber: 'string',
	passToken: 'string',
	genTime: 'string',
	captchaOutput: 'string',
});
export const schemaTeyvatAuthCaptchaSolution = schemaTeyvatAuthCaptchaSolutionV3.or(schemaTeyvatAuthCaptchaSolutionV4);
/**
 * @useDeclaredType
 * @category Authentication
 */
export type TeyvatAuthCaptchaSolution = typeof schemaTeyvatAuthCaptchaSolution.infer;

export const schemaTeyvatAuthenticated = type({
	status: "'authenticated'",
	hoyolabId: 'string',
	deviceId: 'string',
	cookies: schemaTeyvatCookies,
});
export const schemaTeyvatAuthCaptchaRequired = type({
	status: "'captcha_required'",
	captcha: schemaTeyvatAuthCaptcha,
});
export const schemaTeyvatAuthEmailVerificationRequired = type({
	status: "'email_verification_required'",
});
const schemaTeyvatAuthResult = schemaTeyvatAuthenticated
	.or(schemaTeyvatAuthCaptchaRequired)
	.or(schemaTeyvatAuthEmailVerificationRequired);
/**
 * @useDeclaredType
 * @category Authentication
 */
export type TeyvatAuthResult = typeof schemaTeyvatAuthResult.infer;

export interface TeyvatAuthOptions {
	account: string;
	password: string;
	language?: TeyvatLanguage;
	deviceId?: string;
	deviceName?: string;
	deviceModel?: string;
}

export interface TeyvatAuthSession {
	readonly language: TeyvatLanguage;
	login(): Promise<TeyvatAuthResult>;
	completeCaptcha(solution: TeyvatAuthCaptchaSolution): Promise<TeyvatAuthResult>;
	completeEmail(code: string): Promise<TeyvatAuthResult>;
}
