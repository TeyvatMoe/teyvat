import type { TeyvatCookies } from '../types/cookies.ts';

export type CookieInput = TeyvatCookies | string;

const COOKIE_NAME = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;

function _has_invalid_cookie_value_character(value: string): boolean {
	for (const character of value) {
		const code = character.charCodeAt(0);
		if (code <= 31 || code === 127 || character === ';') return true;
	}
	return false;
}

function _assert_cookie_pair(name: string, value: string): void {
	if (!COOKIE_NAME.test(name)) throw new TypeError(`Invalid cookie name: ${name || '<empty>'}`);
	if (_has_invalid_cookie_value_character(value)) throw new TypeError(`Invalid value for cookie ${name}`);
}

export function _parse_cookie_header(header: string): TeyvatCookies {
	const cookies: TeyvatCookies = {};

	for (const part of header.split(';')) {
		const cookie = part.trim();
		if (!cookie) continue;

		const separator = cookie.indexOf('=');
		if (separator === -1) throw new TypeError(`Invalid cookie pair: ${cookie}`);

		const name = cookie.slice(0, separator).trim();
		const value = cookie.slice(separator + 1).trim();
		_assert_cookie_pair(name, value);
		cookies[name] = value;
	}

	return cookies;
}

function _split_set_cookie_header(header: string): string[] {
	return header.split(/,(?=\s*[!#$%&'*+\-.^_`|~0-9A-Za-z]+=)/);
}

function _get_set_cookie_headers(headers: Headers): string[] {
	const get_set_cookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
	if (typeof get_set_cookie === 'function') return get_set_cookie.call(headers);

	const combined = headers.get('set-cookie');
	return combined ? _split_set_cookie_header(combined) : [];
}

export class CookieJar {
	readonly #cookies = new Map<string, string>();
	#revision = 0;

	constructor(cookies: CookieInput) {
		this.replace(cookies);
	}

	replace(cookies: CookieInput): void {
		const parsed = typeof cookies === 'string' ? _parse_cookie_header(cookies) : cookies;
		const entries = Object.entries(parsed);
		for (const [name, value] of entries) _assert_cookie_pair(name, value);

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
			_assert_cookie_pair(name, value);
			if (this.#cookies.get(name) === value) continue;
			this.#cookies.set(name, value);
			changed = true;
		}
		if (changed) this.#revision++;
	}

	to_json(): TeyvatCookies {
		return Object.fromEntries(this.#cookies);
	}

	to_header(overrides: TeyvatCookies = {}): string {
		const cookies = new Map(this.#cookies);
		for (const [name, value] of Object.entries(overrides)) {
			_assert_cookie_pair(name, value);
			cookies.set(name, value);
		}
		return [...cookies].map(([name, value]) => `${name}=${value}`).join('; ');
	}

	update_from_response(headers: Headers, now = Date.now()): void {
		let changed = false;
		for (const header of _get_set_cookie_headers(headers)) {
			const segments = header.split(';').map((segment) => segment.trim());
			const pair = segments.shift();
			if (!pair) continue;

			const separator = pair.indexOf('=');
			if (separator <= 0) continue;

			const name = pair.slice(0, separator).trim();
			const value = pair.slice(separator + 1).trim();
			if (!COOKIE_NAME.test(name) || _has_invalid_cookie_value_character(value)) continue;

			let should_delete = false;
			for (const segment of segments) {
				const attribute_separator = segment.indexOf('=');
				const attribute_name = (attribute_separator === -1 ? segment : segment.slice(0, attribute_separator))
					.trim()
					.toLowerCase();
				const attribute_value = attribute_separator === -1 ? '' : segment.slice(attribute_separator + 1).trim();

				if (attribute_name === 'max-age' && Number(attribute_value) <= 0) should_delete = true;
				if (attribute_name === 'expires') {
					const expires_at = Date.parse(attribute_value);
					if (!Number.isNaN(expires_at) && expires_at <= now) should_delete = true;
				}
			}

			if (should_delete) changed = this.#cookies.delete(name) || changed;
			else if (this.#cookies.get(name) !== value) {
				this.#cookies.set(name, value);
				changed = true;
			}
		}
		if (changed) this.#revision++;
	}
}
