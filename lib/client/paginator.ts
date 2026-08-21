import type { TeyvatPaginator } from '#/types/paginator.ts';

export interface TeyvatPaginatorPage<T, Cursor> {
	items: readonly T[];
	nextCursor: Cursor | null;
}

export interface TeyvatPaginatorOptions<T, Cursor> {
	initialCursor: Cursor;
	limit?: number;
	getPage: (cursor: Cursor) => Promise<TeyvatPaginatorPage<T, Cursor>>;
}

export class _TeyvatPaginator<T, Cursor> implements TeyvatPaginator<T> {
	readonly #getPage: TeyvatPaginatorOptions<T, Cursor>['getPage'];
	readonly #limit?: number;
	#cursor: Cursor | null;
	#buffer: T[] = [];
	#exhausted: boolean;
	#itemsYielded = 0;
	#operation: Promise<void> = Promise.resolve();

	constructor(options: TeyvatPaginatorOptions<T, Cursor>) {
		this.#getPage = options.getPage;
		this.#cursor = options.initialCursor;
		this.#limit = options.limit;
		this.#exhausted = options.limit === 0;
	}

	get exhausted(): boolean {
		return this.#exhausted;
	}

	get itemsYielded(): number {
		return this.#itemsYielded;
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
		if (this.#limit !== undefined && this.#itemsYielded >= this.#limit) {
			this.#complete();
			return { done: true, value: undefined };
		}

		while (this.#buffer.length === 0) {
			if (this.#cursor === null) {
				this.#complete();
				return { done: true, value: undefined };
			}

			const page = await this.#getPage(this.#cursor);
			this.#cursor = page.nextCursor;
			this.#buffer.push(...page.items);
			if (this.#buffer.length === 0) {
				this.#complete();
				return { done: true, value: undefined };
			}
		}

		const value = this.#buffer.shift();
		if (value === undefined) throw new Error('Paginator buffer became empty unexpectedly');
		this.#itemsYielded++;
		if (
			(this.#limit !== undefined && this.#itemsYielded >= this.#limit) ||
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
