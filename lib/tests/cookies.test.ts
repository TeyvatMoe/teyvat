import { describe, expect, test } from 'bun:test';
import { _parseCookieHeader, CookieJar } from '#/auth/cookies.ts';

describe('cookies', () => {
	test('parses and serializes cookie headers', () => {
		expect(_parseCookieHeader('account_id_v2=123; token=a=b')).toEqual({ ['account_id_v2']: '123', token: 'a=b' });
		const jar = new CookieJar('account_id_v2=123; token=abc');
		expect(jar.toJson()).toEqual({ ['account_id_v2']: '123', token: 'abc' });
		expect(jar.toHeader({ token: 'updated' })).toBe('account_id_v2=123; token=updated');
	});

	test('rejects invalid cookie pairs', () => {
		expect(() => _parseCookieHeader('missing-separator')).toThrow('Invalid cookie pair');
		expect(() => new CookieJar({ 'invalid name': 'value' })).toThrow('Invalid cookie name');
		expect(() => new CookieJar({ token: 'bad;value' })).toThrow('Invalid value');
	});

	test('increments revisions only when values change', () => {
		const jar = new CookieJar({ token: 'one' });
		const initialRevision = jar.revision;
		jar.merge({ token: 'one' });
		expect(jar.revision).toBe(initialRevision);
		jar.merge({ token: 'two', extra: 'value' });
		expect(jar.revision).toBe(initialRevision + 1);
	});

	test('merges and deletes Set-Cookie values', () => {
		const jar = new CookieJar({ keep: 'old', remove: 'yes', expired: 'yes' });
		const headers = new Headers();
		headers.append('Set-Cookie', 'keep=new; Path=/');
		headers.append('Set-Cookie', 'remove=; Max-Age=0; Path=/');
		headers.append('Set-Cookie', 'expired=; Expires=Wed, 01 Jan 2020 00:00:00 GMT');
		jar.updateFromResponse(headers, Date.UTC(2026, 0, 1));
		expect(jar.toJson()).toEqual({ keep: 'new' });
	});

	test('ignores malformed response cookies', () => {
		const jar = new CookieJar({ keep: 'value' });
		const revision = jar.revision;
		jar.updateFromResponse(new Headers({ 'Set-Cookie': '=bad; Path=/' }));
		expect(jar.toJson()).toEqual({ keep: 'value' });
		expect(jar.revision).toBe(revision);
	});
});
