import { describe, expect, test } from 'bun:test';
import { _TeyvatPaginator } from '#/client/paginator.ts';

describe('paginator', () => {
	test('does not request a page when the limit is zero', async () => {
		let calls = 0;
		const paginator = new _TeyvatPaginator({
			initialCursor: 1,
			limit: 0,
			getPage: async () => {
				calls++;
				return { items: [1], nextCursor: null };
			},
		});
		expect(await paginator.all()).toEqual([]);
		expect(calls).toBe(0);
		expect(paginator.exhausted).toBe(true);
	});

	test('buffers pages and honors an exact item limit', async () => {
		const cursors: number[] = [];
		const paginator = new _TeyvatPaginator({
			initialCursor: 1,
			limit: 3,
			getPage: async (cursor) => {
				cursors.push(cursor);
				return cursor === 1 ? { items: [1, 2], nextCursor: 2 } : { items: [3, 4], nextCursor: null };
			},
		});
		expect(await paginator.all()).toEqual([1, 2, 3]);
		expect(cursors).toEqual([1, 2]);
		expect(paginator.itemsYielded).toBe(3);
		expect(paginator.exhausted).toBe(true);
	});

	test('serializes concurrent next calls', async () => {
		let active = 0;
		let maximumActive = 0;
		const paginator = new _TeyvatPaginator({
			initialCursor: 1,
			getPage: async () => {
				active++;
				maximumActive = Math.max(maximumActive, active);
				await Promise.resolve();
				active--;
				return { items: [1, 2], nextCursor: null };
			},
		});
		const [first, second] = await Promise.all([paginator.next(), paginator.next()]);
		expect([first.value, second.value]).toEqual([1, 2]);
		expect(maximumActive).toBe(1);
	});

	test('retries the same cursor after a failed page', async () => {
		const cursors: string[] = [];
		let attempts = 0;
		const paginator = new _TeyvatPaginator({
			initialCursor: 'start',
			getPage: async (cursor) => {
				cursors.push(cursor);
				if (attempts++ === 0) throw new Error('temporary failure');
				return { items: ['done'], nextCursor: null };
			},
		});
		await expect(paginator.next()).rejects.toThrow('temporary failure');
		expect(await paginator.next()).toEqual({ done: false, value: 'done' });
		expect(cursors).toEqual(['start', 'start']);
	});
});
