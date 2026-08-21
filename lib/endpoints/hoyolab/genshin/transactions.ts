import { type } from 'arktype';
import type { TeyvatHttpClient } from '#/client/request.ts';
import { TEYVAT_DOMAINS } from '#/consts/domains.ts';
import { _short_language } from '#/utils/misc.ts';

const schema_currency_transaction = type({
	id: 'string',
	datetime: 'string',
	add_num: 'string',
	reason: 'string',
});

const schema_item_transaction = type({
	id: 'string',
	datetime: 'string',
	add_num: 'string',
	reason: 'string',
	name: 'string',
	quality: 'string',
});

export const schema_hoyolab_genshin_currency_transactions_response = type({
	retcode: '0',
	message: 'string',
	data: { list: schema_currency_transaction.array() },
});

export const schema_hoyolab_genshin_item_transactions_response = type({
	retcode: '0',
	message: 'string',
	data: { list: schema_item_transaction.array() },
});

const TRANSACTION_PATHS = {
	primogem: 'GetPrimogemLog',
	crystal: 'GetCrystalLog',
	resin: 'GetResinLog',
	artifact: 'GetArtifactLog',
	weapon: 'GetWeaponLog',
} as const;

interface TransactionRequest {
	authkey: string;
	type: keyof typeof TRANSACTION_PATHS;
	end_id: string;
}

function _transaction_request(client: TeyvatHttpClient, options: TransactionRequest) {
	return {
		domain: TEYVAT_DOMAINS.genshin_transactions,
		path: TRANSACTION_PATHS[options.type],
		params: {
			authkey_ver: 1,
			sign_type: 2,
			authkey: options.authkey,
			lang: _short_language(client.language),
			size: 20,
			end_id: options.end_id,
		},
		use_cookies: false as const,
		skip_auth: true as const,
	};
}

export async function _get_hoyolab_genshin_currency_transactions(
	client: TeyvatHttpClient,
	options: TransactionRequest,
) {
	return await client.request({
		..._transaction_request(client, options),
		schema: schema_hoyolab_genshin_currency_transactions_response,
	});
}

export async function _get_hoyolab_genshin_item_transactions(client: TeyvatHttpClient, options: TransactionRequest) {
	return await client.request({
		..._transaction_request(client, options),
		schema: schema_hoyolab_genshin_item_transactions_response,
	});
}
