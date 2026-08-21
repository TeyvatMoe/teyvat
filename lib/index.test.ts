import { describe, expect, test } from 'bun:test';
import * as publicApi from './index.ts';

describe('public package boundary', () => {
	test('exports only intended runtime values', () => {
		expect(Object.keys(publicApi).sort()).toEqual([
			'Teyvat',
			'TeyvatAccount',
			'TeyvatApiError',
			'TeyvatCodeRedemptionError',
			'TeyvatError',
			'TeyvatRequestError',
			'TeyvatResponseValidationError',
		]);
	});

	test('constructs stable public clients without requesting', () => {
		const teyvat = new publicApi.Teyvat({ cookies: { ['account_id_v2']: '123' }, language: 'en-us' });
		const first = teyvat.account(612_345_678);
		const second = teyvat.account(612_345_678);
		expect(first).toBe(second);
		expect(first).toBeInstanceOf(publicApi.TeyvatAccount);
		expect(first).not.toHaveProperty('inst');
		expect(first.server).toBe('os_usa');
		expect(teyvat.hoyolabId).toBe('123');
		expect(teyvat.language).toBe('en-us');
		expect(teyvat.autoEnable).toBe(false);
		expect(teyvat.checkIn).toBeDefined();
	});

	test('keeps account construction factory-only at runtime', () => {
		const Account = publicApi.TeyvatAccount as unknown as new () => publicApi.TeyvatAccount;
		expect(() => new Account()).toThrow('must be created by Teyvat');
	});

	test('rejects invalid public construction options locally', () => {
		expect(
			() => new publicApi.Teyvat({ cookies: { ['account_id_v2']: '123' }, language: 'xx-xx' as never }),
		).toThrow('supported Genshin language');
		expect(() => new publicApi.Teyvat({ cookies: { ['account_id_v2']: '123' }, accountsCacheTtl: -1 })).toThrow(
			'accountsCacheTtl',
		);
		expect(() => new publicApi.Teyvat({ cookies: { ['account_id_v2']: '123' } }).account(123)).toThrow(
			'Unsupported Genshin UID',
		);
	});
});
