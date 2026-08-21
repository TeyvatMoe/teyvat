import type { TeyvatServer } from '#/types/account/server.ts';
import type { TeyvatLanguage } from '#/types/language.ts';

export function _shortLanguage(language: TeyvatLanguage): string {
	return language.startsWith('zh-') ? language : language.split('-', 1)[0];
}

export function _countdownSeconds(value: number | string, field: string): number {
	if (typeof value === 'string' && !/^\d+$/.test(value)) throw new TypeError(`${field} must be a countdown`);
	const seconds = Number(value);
	if (!Number.isSafeInteger(seconds) || seconds < 0) throw new TypeError(`${field} must be a nonnegative integer`);
	return seconds;
}

export function _completionDate(now: number, value: number | string, field: string): Date {
	return new Date(now + _countdownSeconds(value, field) * 1_000);
}

export function _numericValue(value: number | string, field: string): number {
	if (typeof value === 'string' && !/^\d+(?:\.\d+)?$/.test(value)) throw new TypeError(`${field} must be numeric`);
	const numeric = Number(value);
	if (!Number.isFinite(numeric) || numeric < 0) throw new TypeError(`${field} must be a nonnegative number`);
	return numeric;
}

export function _unixDate(value: number | string, field: string): Date {
	if (typeof value === 'string' && !/^\d+$/.test(value)) throw new TypeError(`${field} must be a Unix timestamp`);
	const seconds = Number(value);
	if (!Number.isSafeInteger(seconds) || seconds < 0)
		throw new TypeError(`${field} must be a nonnegative safe integer`);
	return new Date(seconds * 1_000);
}

export function _nullableUnixDate(value: number | string, field: string): Date | null {
	if (value === 0 || value === '0' || value === '') return null;
	return _unixDate(value, field);
}

export function _currentUtcOffsetMonth(now = Date.now(), offsetHours = 8): number {
	return new Date(now + offsetHours * 3_600_000).getUTCMonth() + 1;
}

export function _currentUtcOffsetDay(now = Date.now(), offsetHours = 8): number {
	return new Date(now + offsetHours * 3_600_000).getUTCDate();
}

export function _hoyolabDatetime(value: string, offsetHours: number, field: string): Date {
	const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/.exec(value);
	if (!match) throw new TypeError(`${field} must be a HoYoLAB date-time`);
	const [, year, month, day, hour, minute, second] = match;
	const parts = [year, month, day, hour, minute, second].map(Number);
	const [numericYear, numericMonth, numericDay, numericHour, numericMinute, numericSecond] = parts;
	const wallTime = Date.UTC(numericYear, numericMonth - 1, numericDay, numericHour, numericMinute, numericSecond);
	const normalized = new Date(wallTime);
	if (
		numericYear < 1970 ||
		normalized.getUTCFullYear() !== numericYear ||
		normalized.getUTCMonth() !== numericMonth - 1 ||
		normalized.getUTCDate() !== numericDay ||
		normalized.getUTCHours() !== numericHour ||
		normalized.getUTCMinutes() !== numericMinute ||
		normalized.getUTCSeconds() !== numericSecond
	)
		throw new TypeError(`${field} must be a valid date-time`);
	return new Date(wallTime - offsetHours * 3_600_000);
}

export function _hoyolabDate(
	value: { year: number; month: number; day: number; hour: number; minute: number; second: number },
	server: TeyvatServer,
	field: string,
): Date {
	const parts = [value.year, value.month, value.day, value.hour, value.minute, value.second];
	if (!parts.every(Number.isSafeInteger)) throw new TypeError(`${field} must contain safe integers`);
	const wallTime = Date.UTC(value.year, value.month - 1, value.day, value.hour, value.minute, value.second);
	const normalized = new Date(wallTime);
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
	return new Date(wallTime - offset * 3_600_000);
}

export async function _sleep(milliseconds: number): Promise<void> {
	await new Promise<void>((resolve) => setTimeout(resolve, milliseconds));
}
