import type { TeyvatCookies } from '../types/cookies.ts';

export type CookieInput = TeyvatCookies | string;

const COOKIE_NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

function hasInvalidCookieValueCharacter(value: string): boolean {
	for (const character of value) {
		const code = character.charCodeAt(0);
		if (code <= 31 || code === 127 || character === ';') return true;
	}
	return false;
}

function assertCookiePair(name: string, value: string): void {
	if (!COOKIE_NAME.test(name)) throw new TypeError(`Invalid cookie name: ${name || '<empty>'}`);
	if (hasInvalidCookieValueCharacter(value)) throw new TypeError(`Invalid value for cookie ${name}`);
}

export function parseCookieHeader(header: string): TeyvatCookies {
	const cookies: TeyvatCookies = {};

	for (const part of header.split(';')) {
		const cookie = part.trim();
		if (!cookie) continue;

		const separator = cookie.indexOf('=');
		if (separator === -1) throw new TypeError(`Invalid cookie pair: ${cookie}`);

		const name = cookie.slice(0, separator).trim();
		const value = cookie.slice(separator + 1).trim();
		assertCookiePair(name, value);
		cookies[name] = value;
	}

	return cookies;
}

function splitSetCookieHeader(header: string): string[] {
	return header.split(/,(?=\s*[!#$%&'*+\-.^_`|~0-9A-Za-z]+=)/);
}

function getSetCookieHeaders(headers: Headers): string[] {
	const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
	if (typeof getSetCookie === 'function') return getSetCookie.call(headers);

	const combined = headers.get('set-cookie');
	return combined ? splitSetCookieHeader(combined) : [];
}

export class CookieJar {
	readonly #cookies = new Map<string, string>();

	constructor(cookies: CookieInput) {
		this.replace(cookies);
	}

	replace(cookies: CookieInput): void {
		const parsed = typeof cookies === 'string' ? parseCookieHeader(cookies) : cookies;
		const entries = Object.entries(parsed);
		for (const [name, value] of entries) assertCookiePair(name, value);

		this.#cookies.clear();
		for (const [name, value] of entries) this.#cookies.set(name, value);
	}

	toJSON(): TeyvatCookies {
		return Object.fromEntries(this.#cookies);
	}

	toHeader(): string {
		return [...this.#cookies].map(([name, value]) => `${name}=${value}`).join('; ');
	}

	updateFromResponse(headers: Headers, now = Date.now()): void {
		for (const header of getSetCookieHeaders(headers)) {
			const segments = header.split(';').map((segment) => segment.trim());
			const pair = segments.shift();
			if (!pair) continue;

			const separator = pair.indexOf('=');
			if (separator <= 0) continue;

			const name = pair.slice(0, separator).trim();
			const value = pair.slice(separator + 1).trim();
			if (!COOKIE_NAME.test(name) || hasInvalidCookieValueCharacter(value)) continue;

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

			if (shouldDelete) this.#cookies.delete(name);
			else this.#cookies.set(name, value);
		}
	}
}
