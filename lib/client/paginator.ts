import type { TeyvatPaginator } from '../types/paginator.ts';

export interface TeyvatPaginatorPage<T, Cursor> {
	items: readonly T[];
	next_cursor: Cursor | null;
}

export interface TeyvatPaginatorOptions<T, Cursor> {
	initial_cursor: Cursor;
	limit?: number;
	get_page: (cursor: Cursor) => Promise<TeyvatPaginatorPage<T, Cursor>>;
}

export class _TeyvatPaginator<T, Cursor> implements TeyvatPaginator<T> {
	readonly #get_page: TeyvatPaginatorOptions<T, Cursor>['get_page'];
	readonly #limit?: number;
	#cursor: Cursor | null;
	#buffer: T[] = [];
	#exhausted: boolean;
	#items_yielded = 0;
	#operation: Promise<void> = Promise.resolve();

	constructor(options: TeyvatPaginatorOptions<T, Cursor>) {
		this.#get_page = options.get_page;
		this.#cursor = options.initial_cursor;
		this.#limit = options.limit;
		this.#exhausted = options.limit === 0;
	}

	get exhausted(): boolean {
		return this.#exhausted;
	}

	get items_yielded(): number {
		return this.#items_yielded;
	}

	[Symbol.asyncIterator](): this {
		return this;
	}

	next(): Promise<IteratorResult<T>> {
		const result = this.#operation.then(async () => await this.#next());
		this.#operation = result.then(
			() => undefined,
			() => undefined,
		);
		return result;
	}

	async all(): Promise<T[]> {
		const items: T[] = [];
		for await (const item of this) items.push(item);
		return items;
	}

	async #next(): Promise<IteratorResult<T>> {
		if (this.#exhausted) return { done: true, value: undefined };
		if (this.#limit !== undefined && this.#items_yielded >= this.#limit) {
			this.#complete();
			return { done: true, value: undefined };
		}

		while (this.#buffer.length === 0) {
			if (this.#cursor === null) {
				this.#complete();
				return { done: true, value: undefined };
			}

			const page = await this.#get_page(this.#cursor);
			this.#cursor = page.next_cursor;
			this.#buffer.push(...page.items);
			if (this.#buffer.length === 0) {
				this.#complete();
				return { done: true, value: undefined };
			}
		}

		const value = this.#buffer.shift();
		if (value === undefined) throw new Error('Paginator buffer became empty unexpectedly');
		this.#items_yielded++;
		if (
			(this.#limit !== undefined && this.#items_yielded >= this.#limit) ||
			(this.#buffer.length === 0 && this.#cursor === null)
		)
			this.#complete();
		return { done: false, value };
	}

	#complete(): void {
		this.#exhausted = true;
		this.#cursor = null;
		this.#buffer = [];
	}
}
