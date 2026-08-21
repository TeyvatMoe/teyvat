import { type } from 'arktype';

export const schemaTeyvatCodeRedemptionResult = type({
	status: "'redeemed'",
});

/**
 * Confirmation that HoYoLAB accepted a gift code for delivery through in-game mail.
 *
 * @interface
 * @useDeclaredType
 * @category Code Redemption
 */
export type TeyvatCodeRedemptionResult = typeof schemaTeyvatCodeRedemptionResult.infer;
