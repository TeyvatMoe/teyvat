import { type } from 'arktype';
import type { TeyvatHttpClient } from '#/client/request.ts';
import { TEYVAT_DOMAINS } from '#/consts/domains.ts';
import { _shortLanguage } from '#/utils/misc.ts';

const schemaCurrencyTransaction = type({
	id: 'string',
	datetime: 'string',
	['add_num']: 'string',
	reason: 'string',
});

const schemaItemTransaction = type({
	id: 'string',
	datetime: 'string',
	['add_num']: 'string',
	reason: 'string',
	name: 'string',
	quality: 'string',
});

const schemaHoyolabGenshinCurrencyTransactionsResponse = type({
	retcode: '0',
	message: 'string',
	data: { list: schemaCurrencyTransaction.array() },
});

const schemaHoyolabGenshinItemTransactionsResponse = type({
	retcode: '0',
	message: 'string',
	data: { list: schemaItemTransaction.array() },
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
	endId: string;
}

function _transactionRequest(client: TeyvatHttpClient, options: TransactionRequest) {
	return {
		domain: TEYVAT_DOMAINS.genshinTransactions,
		path: TRANSACTION_PATHS[options.type],
		params: {
			['authkey_ver']: 1,
			['sign_type']: 2,
			authkey: options.authkey,
			lang: _shortLanguage(client.language),
			size: 20,
			['end_id']: options.endId,
		},
		useCookies: false as const,
		skipAuth: true as const,
	};
}

export async function _getHoyolabGenshinCurrencyTransactions(client: TeyvatHttpClient, options: TransactionRequest) {
	return await client.request({
		..._transactionRequest(client, options),
		schema: schemaHoyolabGenshinCurrencyTransactionsResponse,
	});
}

export async function _getHoyolabGenshinItemTransactions(client: TeyvatHttpClient, options: TransactionRequest) {
	return await client.request({
		..._transactionRequest(client, options),
		schema: schemaHoyolabGenshinItemTransactionsResponse,
	});
}
