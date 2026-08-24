import { describe, expect, test } from 'bun:test';
import { _parseCookieHeader, CookieJar } from '#/auth/cookies.ts';

describe('cookies', () => {
	test('parses and serializes cookie headers', () => {
		expect(_parseCookieHeader('account_id_v2=123; token=a=b; encoded=a%2Fb')).toEqual({
			['account_id_v2']: '123',
			token: 'a=b',
			encoded: 'a%2Fb',
		});
		const jar = new CookieJar('account_id_v2=123; token=a=b; encoded=a%2Fb');
		expect(jar.toJson()).toEqual({ ['account_id_v2']: '123', token: 'a=b', encoded: 'a%2Fb' });
		expect(jar.toHeader({ token: 'updated=value', unknown: 'kept' })).toBe(
			'account_id_v2=123; token=updated=value; encoded=a%2Fb; unknown=kept',
		);
	});

	test('rejects invalid cookie pairs', () => {
		expect(() => _parseCookieHeader('missing-separator')).toThrow('Invalid cookie pair');
		expect(() => new CookieJar({ 'invalid name': 'value' })).toThrow('Invalid cookie name');
		expect(() => new CookieJar({ token: 'bad;value' })).toThrow('Invalid value');
		expect(() => new CookieJar({ token: 'bad value' })).toThrow('Invalid value');
		expect(() => new CookieJar({ token: 'valid' }).toHeader({ token: 'bad;override' })).toThrow('Invalid value');
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
		const jar = new CookieJar({
			keep: 'old',
			remove: 'yes',
			expired: 'yes',
			maxAgeWins: 'old',
			maxAgeDeletes: 'old',
		});
		const headers = new Headers();
		headers.append('Set-Cookie', 'keep=new=value; Path=/; HttpOnly; Secure; SameSite=Lax');
		headers.append('Set-Cookie', 'remove=; Max-Age=0; Path=/');
		headers.append('Set-Cookie', 'expired=; Expires=Wed, 01 Jan 2020 00:00:00 GMT');
		headers.append('Set-Cookie', 'maxAgeWins=new; Max-Age=60; Expires=Wed, 01 Jan 2020 00:00:00 GMT');
		headers.append('Set-Cookie', 'maxAgeDeletes=; Max-Age=0; Expires=Wed, 01 Jan 2030 00:00:00 GMT');
		jar.updateFromResponse(headers, Date.UTC(2026, 0, 1));
		expect(jar.toJson()).toEqual({ keep: 'new=value', maxAgeWins: 'new' });
	});

	test('ignores malformed response cookies', () => {
		const jar = new CookieJar({ keep: 'value' });
		const revision = jar.revision;
		jar.updateFromResponse(new Headers({ 'Set-Cookie': '=bad; Path=/' }));
		expect(jar.toJson()).toEqual({ keep: 'value' });
		expect(jar.revision).toBe(revision);
	});

	test('does not revise the jar for unchanged response values', () => {
		const jar = new CookieJar({ token: 'same' });
		const revision = jar.revision;
		jar.updateFromResponse(new Headers({ 'Set-Cookie': 'token=same; Path=/' }));
		expect(jar.revision).toBe(revision);
	});
});
