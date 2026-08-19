import { expect, test } from 'bun:test';
import * as teyvat from '../lib/index.ts';

test('does not export private transport internals', () => {
	expect('TeyvatHttpClient' in teyvat).toBe(false);
	expect('TEYVAT_DOMAINS' in teyvat).toBe(false);
	expect('CookieJar' in teyvat).toBe(false);
});
