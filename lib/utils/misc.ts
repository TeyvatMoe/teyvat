export function _countdown_seconds(value: number | string, field: string): number {
	if (typeof value === 'string' && !/^\d+$/.test(value)) throw new TypeError(`${field} must be a countdown`);
	const seconds = Number(value);
	if (!Number.isSafeInteger(seconds) || seconds < 0) throw new TypeError(`${field} must be a nonnegative integer`);
	return seconds;
}

export function _completion_date(now: number, value: number | string, field: string): Date {
	return new Date(now + _countdown_seconds(value, field) * 1_000);
}

export function _numeric_value(value: number | string, field: string): number {
	if (typeof value === 'string' && !/^\d+(?:\.\d+)?$/.test(value)) throw new TypeError(`${field} must be numeric`);
	const numeric = Number(value);
	if (!Number.isFinite(numeric) || numeric < 0) throw new TypeError(`${field} must be a nonnegative number`);
	return numeric;
}

export function _unix_date(value: number | string, field: string): Date {
	if (typeof value === 'string' && !/^\d+$/.test(value)) throw new TypeError(`${field} must be a Unix timestamp`);
	const seconds = Number(value);
	if (!Number.isSafeInteger(seconds) || seconds < 0)
		throw new TypeError(`${field} must be a nonnegative safe integer`);
	return new Date(seconds * 1_000);
}

export async function _sleep(milliseconds: number): Promise<void> {
	await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}
