import type { TeyvatServer } from '../types/account/server.ts';

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

export function _current_utc_offset_month(now = Date.now(), offset_hours = 8): number {
	return new Date(now + offset_hours * 3_600_000).getUTCMonth() + 1;
}

export function _hoyolab_datetime(value: string, offset_hours: number, field: string): Date {
	const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(value);
	if (!match) throw new TypeError(`${field} must be a HoYoLAB date-time`);
	const [, year, month, day, hour, minute, second] = match;
	const parts = [year, month, day, hour, minute, second].map(Number);
	const [numeric_year, numeric_month, numeric_day, numeric_hour, numeric_minute, numeric_second] = parts;
	const wall_time = Date.UTC(
		numeric_year,
		numeric_month - 1,
		numeric_day,
		numeric_hour,
		numeric_minute,
		numeric_second,
	);
	const normalized = new Date(wall_time);
	if (
		numeric_year < 1970 ||
		normalized.getUTCFullYear() !== numeric_year ||
		normalized.getUTCMonth() !== numeric_month - 1 ||
		normalized.getUTCDate() !== numeric_day ||
		normalized.getUTCHours() !== numeric_hour ||
		normalized.getUTCMinutes() !== numeric_minute ||
		normalized.getUTCSeconds() !== numeric_second
	)
		throw new TypeError(`${field} must be a valid date-time`);
	return new Date(wall_time - offset_hours * 3_600_000);
}

export function _hoyolab_date(
	value: { year: number; month: number; day: number; hour: number; minute: number; second: number },
	server: TeyvatServer,
	field: string,
): Date {
	const parts = [value.year, value.month, value.day, value.hour, value.minute, value.second];
	if (!parts.every(Number.isSafeInteger)) throw new TypeError(`${field} must contain safe integers`);
	const wall_time = Date.UTC(value.year, value.month - 1, value.day, value.hour, value.minute, value.second);
	const normalized = new Date(wall_time);
	if (
		value.year < 1970 ||
		normalized.getUTCFullYear() !== value.year ||
		normalized.getUTCMonth() !== value.month - 1 ||
		normalized.getUTCDate() !== value.day ||
		normalized.getUTCHours() !== value.hour ||
		normalized.getUTCMinutes() !== value.minute ||
		normalized.getUTCSeconds() !== value.second
	)
		throw new TypeError(`${field} must be a valid date`);
	const offset = server === 'os_usa' ? -5 : server === 'os_euro' ? 1 : 8;
	return new Date(wall_time - offset * 3_600_000);
}

export async function _sleep(milliseconds: number): Promise<void> {
	await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}
