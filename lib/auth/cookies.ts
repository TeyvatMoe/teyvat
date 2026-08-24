import { parseCookie, parseSetCookie, stringifyCookie } from 'cookie';
import type { TeyvatCookies } from '#/types/cookies.ts';

export type CookieInput = TeyvatCookies | string;

const COOKIE_NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const IDENTITY = (value: string) => value;

function _hasInvalidCookieValueCharacter(value: string): boolean {
	for (const character of value) {
		const code = character.charCodeAt(0);
		if (code <= 31 || code === 127 || character === ';') return true;
	}
	return false;
}

function _assertCookiePair(name: string, value: string): void {
	if (!COOKIE_NAME.test(name)) throw new TypeError(`Invalid cookie name: ${name || '<empty>'}`);
	if (_hasInvalidCookieValueCharacter(value)) throw new TypeError(`Invalid value for cookie ${name}`);
	try {
		stringifyCookie({ [name]: value }, { encode: IDENTITY });
	} catch {
		throw new TypeError(`Invalid value for cookie ${name}`);
	}
}

export function _parseCookieHeader(header: string): TeyvatCookies {
	const cookies: TeyvatCookies = {};

	for (const part of header.split(';')) {
		const cookie = part.trim();
		if (!cookie) continue;

		const separator = cookie.indexOf('=');
		if (separator === -1) throw new TypeError(`Invalid cookie pair: ${cookie}`);

		const parsed = parseCookie(cookie, { decode: IDENTITY });
		const entry = Object.entries(parsed).find((item): item is [string, string] => item[1] !== undefined);
		if (!entry) throw new TypeError(`Invalid cookie pair: ${cookie}`);
		const [name, value] = entry;
		_assertCookiePair(name, value);
		cookies[name] = value;
	}

	return cookies;
}

function _splitSetCookieHeader(header: string): string[] {
	return header.split(/,(?=\s*[!#$%&'*+\-.^_`|~0-9A-Za-z]+=)/);
}

function _getSetCookieHeaders(headers: Headers): string[] {
	const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
	if (typeof getSetCookie === 'function') return getSetCookie.call(headers);

	const combined = headers.get('set-cookie');
	return combined ? _splitSetCookieHeader(combined) : [];
}

function _parseResponseCookie(header: string, now: number) {
	try {
		const parsed = parseSetCookie(header, { decode: IDENTITY });
		if (parsed.value === undefined) return;
		_assertCookiePair(parsed.name, parsed.value);
		const shouldDelete =
			parsed.maxAge !== undefined
				? parsed.maxAge <= 0
				: parsed.expires !== undefined && parsed.expires.getTime() <= now;
		return { name: parsed.name, value: parsed.value, shouldDelete };
	} catch {
		return;
	}
}

export class CookieJar {
	readonly #cookies = new Map<string, string>();
	#revision = 0;

	constructor(cookies: CookieInput) {
		this.replace(cookies);
	}

	replace(cookies: CookieInput): void {
		const parsed = typeof cookies === 'string' ? _parseCookieHeader(cookies) : cookies;
		const entries = Object.entries(parsed);
		for (const [name, value] of entries) _assertCookiePair(name, value);

		this.#cookies.clear();
		for (const [name, value] of entries) this.#cookies.set(name, value);
		this.#revision++;
	}

	get revision(): number {
		return this.#revision;
	}

	get(name: string): string | undefined {
		return this.#cookies.get(name);
	}

	has(name: string): boolean {
		return this.#cookies.has(name);
	}

	merge(cookies: TeyvatCookies): void {
		let changed = false;
		for (const [name, value] of Object.entries(cookies)) {
			_assertCookiePair(name, value);
			if (this.#cookies.get(name) === value) continue;
			this.#cookies.set(name, value);
			changed = true;
		}
		if (changed) this.#revision++;
	}

	toJson(): TeyvatCookies {
		return Object.fromEntries(this.#cookies);
	}

	toHeader(overrides: TeyvatCookies = {}): string {
		const cookies = new Map(this.#cookies);
		for (const [name, value] of Object.entries(overrides)) {
			_assertCookiePair(name, value);
			cookies.set(name, value);
		}
		return stringifyCookie(Object.fromEntries(cookies), { encode: IDENTITY });
	}

	updateFromResponse(headers: Headers, now = Date.now()): void {
		let changed = false;
		for (const header of _getSetCookieHeaders(headers)) {
			const parsed = _parseResponseCookie(header, now);
			if (!parsed) continue;
			if (parsed.shouldDelete) changed = this.#cookies.delete(parsed.name) || changed;
			else if (this.#cookies.get(parsed.name) !== parsed.value) {
				this.#cookies.set(parsed.name, parsed.value);
				changed = true;
			}
		}
		if (changed) this.#revision++;
	}
}
