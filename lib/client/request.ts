import type { Type } from 'arktype';
import { type CookieInput, CookieJar } from '#/auth/cookies.ts';
import type { TeyvatDomain } from '#/consts/domains.ts';
import type { TeyvatCookies } from '#/types/cookies.ts';
import { schemaTeyvatLanguage, type TeyvatLanguage } from '#/types/language.ts';
import { TeyvatApiError, TeyvatError, TeyvatRequestError, TeyvatResponseValidationError } from './errors.ts';

type Fetch = (input: Request | string | URL, init?: RequestInit) => Promise<Response>;
type QueryValue = boolean | number | string | null | undefined;
type ResponseData<Schema extends Type> = Schema['infer'] extends { data: infer Data } ? Data : never;
type HeaderInput = ConstructorParameters<typeof Headers>[0];

export interface TeyvatRequestOptions<Schema extends Type> {
	domain: TeyvatDomain;
	path: string;
	schema: Schema;
	method?: string;
	params?: Readonly<Record<string, QueryValue>>;
	body?: unknown;
	headers?: HeaderInput;
	signal?: AbortSignal;
	skipAuth?: boolean;
	useCookies?: boolean;
	replayAuth?: boolean;
}

export interface TeyvatHttpClientOptions {
	fetch?: Fetch;
	timeoutMs?: number;
	language?: TeyvatLanguage;
	prepareAuth?: () => Promise<void>;
	repairAuth?: () => Promise<boolean>;
	onCookiesUpdate?: (cookies: TeyvatCookies) => Promise<void> | void;
}

export type TeyvatRawRequestOptions = Omit<TeyvatRequestOptions<Type>, 'schema'>;

export interface TeyvatRawResponse {
	data: unknown;
	headers: Headers;
}

const AUTH_RETCODES = new Set([-1071, -100, 10001]);

function _buildUrl(domain: TeyvatDomain, path: string, params?: Readonly<Record<string, QueryValue>>): URL {
	const base = domain.endsWith('/') ? domain : `${domain}/`;
	const url = new URL(path.replace(/^\/+/, ''), base);

	for (const [name, value] of Object.entries(params ?? {})) {
		if (value !== null && value !== undefined) url.searchParams.set(name, String(value));
	}

	return url;
}

function _safeEndpoint(url: URL): string {
	return `${url.origin}${url.pathname}`;
}

function _validationIssues(cause: unknown): string[] {
	if (cause instanceof Error && cause.message) return [cause.message];
	return [String(cause)];
}

export class TeyvatHttpClient {
	readonly cookies: CookieJar;
	readonly language: TeyvatLanguage;
	readonly #fetch: Fetch;
	readonly #timeoutMs: number;
	readonly #prepareAuth?: () => Promise<void>;
	readonly #repairAuth?: () => Promise<boolean>;
	readonly #onCookiesUpdate?: (cookies: TeyvatCookies) => Promise<void> | void;
	#cookiesDirty = false;
	#cookiesPersisting?: Promise<void>;

	constructor(cookies: CookieInput, options: TeyvatHttpClientOptions = {}) {
		this.cookies = new CookieJar(cookies);
		try {
			this.language = schemaTeyvatLanguage.assert(options.language ?? 'en-us');
		} catch {
			throw new TeyvatError('language must be a supported Genshin language');
		}
		this.#fetch = options.fetch ?? globalThis.fetch;
		this.#timeoutMs = options.timeoutMs ?? 30_000;
		this.#prepareAuth = options.prepareAuth;
		this.#repairAuth = options.repairAuth;
		this.#onCookiesUpdate = options.onCookiesUpdate;

		if (!Number.isFinite(this.#timeoutMs) || this.#timeoutMs <= 0) {
			throw new RangeError('timeoutMs must be a positive finite number');
		}
	}

	async request<Schema extends Type>(options: TeyvatRequestOptions<Schema>): Promise<ResponseData<Schema>> {
		return await this.#request(options, false);
	}

	async authenticatedRawRequest(options: TeyvatRawRequestOptions, repairAuth = false): Promise<TeyvatRawResponse> {
		const useCookies = options.useCookies !== false;
		if (useCookies && !options.skipAuth) await this.#prepareAuth?.();
		if (useCookies && this.#cookiesDirty) await this.#persistCookies();
		const response = await this.rawRequest(options);
		if (
			repairAuth &&
			useCookies &&
			!options.skipAuth &&
			typeof response.data === 'object' &&
			response.data !== null &&
			'retcode' in response.data &&
			typeof response.data.retcode === 'number' &&
			AUTH_RETCODES.has(response.data.retcode)
		)
			await this.#repairAuth?.();
		return response;
	}

	async #request<Schema extends Type>(
		options: TeyvatRequestOptions<Schema>,
		retried: boolean,
	): Promise<ResponseData<Schema>> {
		const method = (options.method ?? 'GET').toUpperCase();
		const url = _buildUrl(options.domain, options.path, options.params);
		const endpoint = _safeEndpoint(url);
		const useCookies = options.useCookies !== false;
		const response = await this.authenticatedRawRequest(options);
		const raw = response.data;

		if (typeof raw === 'object' && raw !== null && 'retcode' in raw && typeof raw.retcode === 'number') {
			if (raw.retcode !== 0) {
				const upstreamMessage = 'message' in raw && typeof raw.message === 'string' ? raw.message : '';
				const error = new TeyvatApiError(raw.retcode, upstreamMessage, method, endpoint);
				if (!retried && useCookies && !options.skipAuth && AUTH_RETCODES.has(raw.retcode) && this.#repairAuth) {
					const repaired = await this.#repairAuth();
					if (repaired && options.replayAuth !== false && (method === 'GET' || method === 'HEAD'))
						return await this.#request(options, true);
				}
				throw error;
			}
		}

		let validated: unknown;
		try {
			validated = options.schema.assert(raw);
		} catch (cause) {
			throw new TeyvatResponseValidationError(method, endpoint, _validationIssues(cause), { cause });
		}

		return (validated as { data: ResponseData<Schema> }).data;
	}

	async rawRequest(options: TeyvatRawRequestOptions): Promise<TeyvatRawResponse> {
		const method = (options.method ?? 'GET').toUpperCase();
		const url = _buildUrl(options.domain, options.path, options.params);
		const endpoint = _safeEndpoint(url);
		const headers = new Headers(options.headers);
		if (!headers.has('Accept')) headers.set('Accept', 'application/json');

		const useCookies = options.useCookies !== false;
		if (useCookies) {
			const cookieHeader = this.cookies.toHeader();
			if (cookieHeader && !headers.has('Cookie')) headers.set('Cookie', cookieHeader);
		}

		let body: string | undefined;
		if (options.body !== undefined) {
			try {
				body = JSON.stringify(options.body);
			} catch (cause) {
				throw new TeyvatRequestError(
					'body',
					method,
					endpoint,
					`Could not serialize request body for ${method} ${endpoint}`,
					{
						cause,
					},
				);
			}
			if (!headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
		}

		const controller = new AbortController();
		let timedOut = false;
		const onAbort = () => controller.abort(options.signal?.reason);
		if (options.signal?.aborted) onAbort();
		else options.signal?.addEventListener('abort', onAbort, { once: true });
		const timeout = setTimeout(() => {
			timedOut = true;
			controller.abort(new Error('Request timed out'));
		}, this.#timeoutMs);

		let response: Response;
		try {
			response = await this.#fetch(url, { method, headers, body, signal: controller.signal });
		} catch (cause) {
			const kind = timedOut ? 'timeout' : 'network';
			const message = timedOut
				? `HoYoLAB request timed out for ${method} ${endpoint}`
				: `HoYoLAB request failed for ${method} ${endpoint}`;
			throw new TeyvatRequestError(kind, method, endpoint, message, { cause });
		} finally {
			clearTimeout(timeout);
			options.signal?.removeEventListener('abort', onAbort);
		}

		if (useCookies) {
			const revision = this.cookies.revision;
			this.cookies.updateFromResponse(response.headers);
			if (this.cookies.revision !== revision) await this.#persistCookies();
		}

		let raw: unknown;
		try {
			raw = JSON.parse(await response.text());
		} catch (cause) {
			throw new TeyvatRequestError(
				'json',
				method,
				endpoint,
				`HoYoLAB returned invalid JSON for ${method} ${endpoint}`,
				{
					cause,
					status: response.status,
				},
			);
		}

		if (!response.ok) {
			throw new TeyvatRequestError(
				'http',
				method,
				endpoint,
				`HoYoLAB returned HTTP ${response.status} for ${method} ${endpoint}`,
				{ status: response.status },
			);
		}

		return { data: raw, headers: response.headers };
	}

	async mergeCookies(cookies: TeyvatCookies): Promise<void> {
		const revision = this.cookies.revision;
		this.cookies.merge(cookies);
		if (this.cookies.revision !== revision) await this.#persistCookies();
	}

	async #persistCookies(): Promise<void> {
		if (!this.#onCookiesUpdate) return;
		this.#cookiesDirty = true;
		if (this.#cookiesPersisting) return await this.#cookiesPersisting;

		const persistence = (async () => {
			while (this.#cookiesDirty) {
				this.#cookiesDirty = false;
				try {
					await this.#onCookiesUpdate?.(this.cookies.toJson());
				} catch (cause) {
					this.#cookiesDirty = true;
					throw new TeyvatError('Could not persist updated cookies', { cause });
				}
			}
		})();
		this.#cookiesPersisting = persistence;
		try {
			await persistence;
		} finally {
			if (this.#cookiesPersisting === persistence) this.#cookiesPersisting = undefined;
		}
	}
}

const clients = new WeakMap<object, TeyvatHttpClient>();

export function _initializeHttpClient(
	owner: object,
	cookies: CookieInput,
	options: TeyvatHttpClientOptions = {},
): void {
	clients.set(owner, new TeyvatHttpClient(cookies, options));
}

export function _getHttpClient(owner: object): TeyvatHttpClient {
	const client = clients.get(owner);
	if (!client) throw new Error('Teyvat HTTP client has not been initialized');
	return client;
}
