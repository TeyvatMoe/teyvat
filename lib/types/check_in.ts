import { type } from 'arktype';
import type { TeyvatPaginator } from './paginator.ts';

const schemaReward = type({
	name: 'string',
	amount: 'number.integer >= 0',
	icon: 'string',
});

export const schemaTeyvatCheckInInfo = type({
	signedIn: 'boolean',
	claimedDays: 'number.integer >= 0',
	missedDays: 'number.integer >= 0',
	rewards: schemaReward.array(),
});

const schemaCaptcha = type({
	version: "'v3'",
	gt: 'string',
	challenge: 'string',
});

export const schemaTeyvatCheckInCaptchaSolution = type({
	version: "'v3'",
	geetestChallenge: 'string',
	geetestValidate: 'string',
	geetestSeccode: 'string',
});

const schemaClaimed = type({
	status: type.enumerated('claimed', 'already_claimed'),
	claimedDays: 'number.integer >= 1',
	reward: schemaReward,
});
const schemaCaptchaRequired = type({
	status: "'captcha_required'",
	captcha: schemaCaptcha,
});
export const schemaTeyvatCheckInResult = schemaClaimed.or(schemaCaptchaRequired);

export const schemaTeyvatCheckInHistoryEntry = type({
	id: 'number.integer >= 0',
	name: 'string',
	amount: 'number.integer >= 0',
	icon: 'string',
	claimedAt: 'Date',
});

/**
 * The HoYoLAB account-wide Genshin check-in state for the current month.
 *
 * @interface
 * @useDeclaredType
 * @category Daily Check-In
 */
export type TeyvatCheckInInfo = typeof schemaTeyvatCheckInInfo.infer;

/**
 * The result of attempting to claim the current daily check-in reward.
 *
 * @useDeclaredType
 * @category Daily Check-In
 */
export type TeyvatCheckInResult = typeof schemaTeyvatCheckInResult.infer;

/**
 * A Geetest v3 solution for a pending daily check-in challenge.
 *
 * @interface
 * @useDeclaredType
 * @category Daily Check-In
 */
export type TeyvatCheckInCaptchaSolution = typeof schemaTeyvatCheckInCaptchaSolution.infer;

/**
 * One reward from the HoYoLAB account-wide check-in history.
 *
 * @interface
 * @useDeclaredType
 * @category Daily Check-In
 */
export type TeyvatCheckInHistoryEntry = typeof schemaTeyvatCheckInHistoryEntry.infer;

/** @category Daily Check-In */
export interface TeyvatCheckInClaimOptions {
	captchaSolution?: TeyvatCheckInCaptchaSolution;
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
