/** @category Core */
export interface TeyvatPaginator<T> extends AsyncIterableIterator<T> {
	readonly exhausted: boolean;
	readonly items_yielded: number;
	all(): Promise<T[]>;
}
