import { type } from 'arktype';
import type { TeyvatPaginator } from './paginator.ts';

const schema_reward = type({
	name: 'string',
	amount: 'number.integer >= 0',
	icon: 'string',
});

export const schema_teyvat_check_in_info = type({
	signed_in: 'boolean',
	claimed_days: 'number.integer >= 0',
	missed_days: 'number.integer >= 0',
	rewards: schema_reward.array(),
});

const schema_captcha = type({
	version: "'v3'",
	gt: 'string',
	challenge: 'string',
});

export const schema_teyvat_check_in_captcha_solution = type({
	version: "'v3'",
	geetest_challenge: 'string',
	geetest_validate: 'string',
	geetest_seccode: 'string',
});

const schema_claimed = type({
	status: type.enumerated('claimed', 'already_claimed'),
	claimed_days: 'number.integer >= 1',
	reward: schema_reward,
});
const schema_captcha_required = type({
	status: "'captcha_required'",
	captcha: schema_captcha,
});
export const schema_teyvat_check_in_result = schema_claimed.or(schema_captcha_required);

export const schema_teyvat_check_in_history_entry = type({
	id: 'number.integer >= 0',
	name: 'string',
	amount: 'number.integer >= 0',
	icon: 'string',
	claimed_at: 'Date',
});

/**
 * The HoYoLAB account-wide Genshin check-in state for the current month.
 *
 * @interface
 * @useDeclaredType
 * @category Daily Check-In
 */
export type TeyvatCheckInInfo = typeof schema_teyvat_check_in_info.infer;

/**
 * The result of attempting to claim the current daily check-in reward.
 *
 * @useDeclaredType
 * @category Daily Check-In
 */
export type TeyvatCheckInResult = typeof schema_teyvat_check_in_result.infer;

/**
 * A Geetest v3 solution for a pending daily check-in challenge.
 *
 * @interface
 * @useDeclaredType
 * @category Daily Check-In
 */
export type TeyvatCheckInCaptchaSolution = typeof schema_teyvat_check_in_captcha_solution.infer;

/**
 * One reward from the HoYoLAB account-wide check-in history.
 *
 * @interface
 * @useDeclaredType
 * @category Daily Check-In
 */
export type TeyvatCheckInHistoryEntry = typeof schema_teyvat_check_in_history_entry.infer;

/** @category Daily Check-In */
export interface TeyvatCheckInClaimOptions {
	captcha_solution?: TeyvatCheckInCaptchaSolution;
}

/** @category Daily Check-In */
export interface TeyvatCheckInHistoryOptions {
	limit?: number;
}

/** @category Daily Check-In */
export interface TeyvatCheckInClient {
	info(): Promise<TeyvatCheckInInfo>;
	claim(options?: TeyvatCheckInClaimOptions): Promise<TeyvatCheckInResult>;
	history(options?: TeyvatCheckInHistoryOptions): TeyvatPaginator<TeyvatCheckInHistoryEntry>;
}
