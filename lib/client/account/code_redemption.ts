import { TeyvatError } from '#/client/errors.ts';
import { _getHttpClient } from '#/client/request.ts';
import { _redeemHoyolabGenshinCode } from '#/endpoints/hoyolab/genshin/code_redemption.ts';
import { schemaTeyvatCodeRedemptionResult, type TeyvatCodeRedemptionResult } from '#/types/account/code_redemption.ts';
import { _getAccountOwner, type TeyvatAccount } from './index.ts';

export async function _redeemAccountCode(account: TeyvatAccount, value: string): Promise<TeyvatCodeRedemptionResult> {
	const code = value.trim();
	if (!code) throw new TeyvatError('Code redemption code must not be empty');
	await _redeemHoyolabGenshinCode(_getHttpClient(_getAccountOwner(account)), account.uid, account.server, code);
	return schemaTeyvatCodeRedemptionResult.assert({ status: 'redeemed' });
}
