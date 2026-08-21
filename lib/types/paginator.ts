/** @category Core */
export interface TeyvatPaginator<T> extends AsyncIterableIterator<T> {
	readonly exhausted: boolean;
	readonly itemsYielded: number;
	all(): Promise<T[]>;
}
