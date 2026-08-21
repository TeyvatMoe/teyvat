import { type } from 'arktype';

export const schema_teyvat_code_redemption_result = type({
	status: "'redeemed'",
});

/**
 * Confirmation that HoYoLAB accepted a gift code for delivery through in-game mail.
 *
 * @interface
 * @useDeclaredType
 * @category Code Redemption
 */
export type TeyvatCodeRedemptionResult = typeof schema_teyvat_code_redemption_result.infer;
