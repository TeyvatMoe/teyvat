import type { TeyvatCookies } from '#/types/cookies.ts';

export type CookieInput = TeyvatCookies | string;

const COOKIE_NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

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
}

export function _parseCookieHeader(header: string): TeyvatCookies {
	const cookies: TeyvatCookies = {};

	for (const part of header.split(';')) {
		const cookie = part.trim();
		if (!cookie) continue;

		const separator = cookie.indexOf('=');
		if (separator === -1) throw new TypeError(`Invalid cookie pair: ${cookie}`);

		const name = cookie.slice(0, separator).trim();
		const value = cookie.slice(separator + 1).trim();
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

interface ParsedSetCookie {
	name: string;
	value: string;
	shouldDelete: boolean;
}

function _deletesCookie(attributes: string[], now: number): boolean {
	return attributes.some((attribute) => {
		const separator = attribute.indexOf('=');
		const name = (separator === -1 ? attribute : attribute.slice(0, separator)).trim().toLowerCase();
		const value = separator === -1 ? '' : attribute.slice(separator + 1).trim();
		if (name === 'max-age') return Number(value) <= 0;
		if (name !== 'expires') return false;
		const expiresAt = Date.parse(value);
		return !Number.isNaN(expiresAt) && expiresAt <= now;
	});
}

function _parseSetCookie(header: string, now: number): ParsedSetCookie | undefined {
	const [pair, ...attributes] = header.split(';').map((segment) => segment.trim());
	if (!pair) return undefined;
	const separator = pair.indexOf('=');
	if (separator <= 0) return undefined;
	const name = pair.slice(0, separator).trim();
	const value = pair.slice(separator + 1).trim();
	if (!COOKIE_NAME.test(name) || _hasInvalidCookieValueCharacter(value)) return undefined;
	return { name, value, shouldDelete: _deletesCookie(attributes, now) };
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
		return [...cookies].map(([name, value]) => `${name}=${value}`).join('; ');
	}

	updateFromResponse(headers: Headers, now = Date.now()): void {
		let changed = false;
		for (const header of _getSetCookieHeaders(headers)) {
			const parsed = _parseSetCookie(header, now);
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
