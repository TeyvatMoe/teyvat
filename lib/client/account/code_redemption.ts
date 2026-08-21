import { _redeem_hoyolab_genshin_code } from '../../endpoints/hoyolab/genshin/code_redemption.ts';
import {
	schema_teyvat_code_redemption_result,
	type TeyvatCodeRedemptionResult,
} from '../../types/account/code_redemption.ts';
import { TeyvatError } from '../errors.ts';
import { _get_http_client } from '../request.ts';
import type { TeyvatAccount } from './index.ts';

export async function _redeem_account_code(account: TeyvatAccount, value: string): Promise<TeyvatCodeRedemptionResult> {
	const code = value.trim();
	if (!code) throw new TeyvatError('Code redemption code must not be empty');
	await _redeem_hoyolab_genshin_code(_get_http_client(account.inst), account.uid, account.server, code);
	return schema_teyvat_code_redemption_result.assert({ status: 'redeemed' });
}
