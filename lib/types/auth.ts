import { type } from 'arktype';
import { schema_teyvat_cookies } from './cookies.ts';

const schema_teyvat_auth_captcha_v3 = type({
	version: "'v3'",
	gt: 'string',
	challenge: 'string',
	new_captcha: 'number.integer',
	success: 'number.integer',
});
const schema_teyvat_auth_captcha_v4 = type({
	version: "'v4'",
	captcha_id: 'string',
	risk_type: 'string',
	session_id: 'string',
	new_captcha: 'number.integer',
	success: 'number.integer',
});
const schema_teyvat_auth_captcha = schema_teyvat_auth_captcha_v3.or(schema_teyvat_auth_captcha_v4);
/**
 * @useDeclaredType
 * @category Authentication
 */
export type TeyvatAuthCaptcha = typeof schema_teyvat_auth_captcha.infer;

const schema_teyvat_auth_captcha_solution_v3 = type({
	version: "'v3'",
	geetest_challenge: 'string',
	geetest_validate: 'string',
	geetest_seccode: 'string',
});
const schema_teyvat_auth_captcha_solution_v4 = type({
	version: "'v4'",
	captcha_id: 'string',
	lot_number: 'string',
	pass_token: 'string',
	gen_time: 'string',
	captcha_output: 'string',
});
export const schema_teyvat_auth_captcha_solution = schema_teyvat_auth_captcha_solution_v3.or(
	schema_teyvat_auth_captcha_solution_v4,
);
/**
 * @useDeclaredType
 * @category Authentication
 */
export type TeyvatAuthCaptchaSolution = typeof schema_teyvat_auth_captcha_solution.infer;

export const schema_teyvat_authenticated = type({
	status: "'authenticated'",
	hoyolab_id: 'string',
	device_id: 'string',
	cookies: schema_teyvat_cookies,
});
export const schema_teyvat_auth_captcha_required = type({
	status: "'captcha_required'",
	captcha: schema_teyvat_auth_captcha,
});
export const schema_teyvat_auth_email_verification_required = type({
	status: "'email_verification_required'",
});
const schema_teyvat_auth_result = schema_teyvat_authenticated
	.or(schema_teyvat_auth_captcha_required)
	.or(schema_teyvat_auth_email_verification_required);
/**
 * @useDeclaredType
 * @category Authentication
 */
export type TeyvatAuthResult = typeof schema_teyvat_auth_result.infer;

export interface TeyvatAuthOptions {
	account: string;
	password: string;
	device_id?: string;
	device_name?: string;
	device_model?: string;
}

export interface TeyvatAuthSession {
	login(): Promise<TeyvatAuthResult>;
	complete_captcha(solution: TeyvatAuthCaptchaSolution): Promise<TeyvatAuthResult>;
	complete_email(code: string): Promise<TeyvatAuthResult>;
}
