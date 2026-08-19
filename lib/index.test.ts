import { describe, expect, test } from 'bun:test';
import arkenv from 'arkenv';
import type { TeyvatAccount } from './client/account/index.ts';
import { Teyvat, type TeyvatAccountInfo } from './index.ts';

const env = arkenv({ TEST_COOKIES: 'string' });

const cookies = env.TEST_COOKIES;
const teyvat = new Teyvat({ cookies });

describe('teyvat', () => {
	let account: TeyvatAccount;
	let info: TeyvatAccountInfo;
	test('teyvat.accounts()', async () => {
		const accounts = await teyvat.accounts();

		expect(accounts.length).toBeGreaterThan(0);

		account = accounts[0];

		for (const x of accounts) console.log([x.uid, x.nickname, x.server, x.level]);
	});

	test('account.info()', async () => {
		info = await account.info();

		expect(info).toBeDefined();

		console.log({ info });
	});
});
