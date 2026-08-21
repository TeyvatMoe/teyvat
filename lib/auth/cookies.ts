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
			const segments = header.split(';').map((segment) => segment.trim());
			const pair = segments.shift();
			if (!pair) continue;

			const separator = pair.indexOf('=');
			if (separator <= 0) continue;

			const name = pair.slice(0, separator).trim();
			const value = pair.slice(separator + 1).trim();
			if (!COOKIE_NAME.test(name) || _hasInvalidCookieValueCharacter(value)) continue;

			let shouldDelete = false;
			for (const segment of segments) {
				const attributeSeparator = segment.indexOf('=');
				const attributeName = (attributeSeparator === -1 ? segment : segment.slice(0, attributeSeparator))
					.trim()
					.toLowerCase();
				const attributeValue = attributeSeparator === -1 ? '' : segment.slice(attributeSeparator + 1).trim();

				if (attributeName === 'max-age' && Number(attributeValue) <= 0) shouldDelete = true;
				if (attributeName === 'expires') {
					const expiresAt = Date.parse(attributeValue);
					if (!Number.isNaN(expiresAt) && expiresAt <= now) shouldDelete = true;
				}
			}

			if (shouldDelete) changed = this.#cookies.delete(name) || changed;
			else if (this.#cookies.get(name) !== value) {
				this.#cookies.set(name, value);
				changed = true;
			}
		}
		if (changed) this.#revision++;
	}
}
