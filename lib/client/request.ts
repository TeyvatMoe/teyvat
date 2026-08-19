import type { Type } from 'arktype';
import { type CookieInput, CookieJar } from '../auth/cookies.ts';
import type { TeyvatDomain } from '../consts/domains.ts';
import { TeyvatApiError, TeyvatRequestError, TeyvatResponseValidationError } from './errors.ts';

type Fetch = (input: Request | string | URL, init?: RequestInit) => Promise<Response>;
type QueryValue = boolean | number | string | null | undefined;
type ResponseData<schema extends Type> = schema['infer'] extends { data: infer data } ? data : never;
type HeaderInput = ConstructorParameters<typeof Headers>[0];

export interface TeyvatRequestOptions<schema extends Type> {
	domain: TeyvatDomain;
	path: string;
	schema: schema;
	method?: string;
	params?: Readonly<Record<string, QueryValue>>;
	body?: unknown;
	headers?: HeaderInput;
	signal?: AbortSignal;
}

export interface TeyvatHttpClientOptions {
	fetch?: Fetch;
	timeout_ms?: number;
}

function _build_url(domain: TeyvatDomain, path: string, params?: Readonly<Record<string, QueryValue>>): URL {
	const base = domain.endsWith('/') ? domain : `${domain}/`;
	const url = new URL(path.replace(/^\/+/, ''), base);

	for (const [name, value] of Object.entries(params ?? {})) {
		if (value !== null && value !== undefined) url.searchParams.set(name, String(value));
	}

	return url;
}

function _safe_endpoint(url: URL): string {
	return `${url.origin}${url.pathname}`;
}

function _validation_issues(cause: unknown): string[] {
	if (cause instanceof Error && cause.message) return [cause.message];
	return [String(cause)];
}

export class TeyvatHttpClient {
	readonly cookies: CookieJar;
	readonly #fetch: Fetch;
	readonly #timeout_ms: number;

	constructor(cookies: CookieInput, options: TeyvatHttpClientOptions = {}) {
		this.cookies = new CookieJar(cookies);
		this.#fetch = options.fetch ?? globalThis.fetch;
		this.#timeout_ms = options.timeout_ms ?? 30_000;

		if (!Number.isFinite(this.#timeout_ms) || this.#timeout_ms <= 0) {
			throw new RangeError('timeout_ms must be a positive finite number');
		}
	}

	async request<schema extends Type>(options: TeyvatRequestOptions<schema>): Promise<ResponseData<schema>> {
		const method = (options.method ?? 'GET').toUpperCase();
		const url = _build_url(options.domain, options.path, options.params);
		const endpoint = _safe_endpoint(url);
		const headers = new Headers(options.headers);
		if (!headers.has('Accept')) headers.set('Accept', 'application/json');

		const cookie_header = this.cookies.to_header();
		if (cookie_header) headers.set('Cookie', cookie_header);

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
		let timed_out = false;
		const on_abort = () => controller.abort(options.signal?.reason);
		if (options.signal?.aborted) on_abort();
		else options.signal?.addEventListener('abort', on_abort, { once: true });
		const timeout = setTimeout(() => {
			timed_out = true;
			controller.abort(new Error('Request timed out'));
		}, this.#timeout_ms);

		let response: Response;
		try {
			response = await this.#fetch(url, { method, headers, body, signal: controller.signal });
		} catch (cause) {
			const kind = timed_out ? 'timeout' : 'network';
			const message = timed_out
				? `HoYoLAB request timed out for ${method} ${endpoint}`
				: `HoYoLAB request failed for ${method} ${endpoint}`;
			throw new TeyvatRequestError(kind, method, endpoint, message, { cause });
		} finally {
			clearTimeout(timeout);
			options.signal?.removeEventListener('abort', on_abort);
		}

		this.cookies.update_from_response(response.headers);

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

		if (typeof raw === 'object' && raw !== null && 'retcode' in raw && typeof raw.retcode === 'number') {
			if (raw.retcode !== 0) {
				const upstream_message = 'message' in raw && typeof raw.message === 'string' ? raw.message : '';
				throw new TeyvatApiError(raw.retcode, upstream_message, method, endpoint);
			}
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

		let validated: unknown;
		try {
			validated = options.schema.assert(raw);
		} catch (cause) {
			throw new TeyvatResponseValidationError(method, endpoint, _validation_issues(cause), { cause });
		}

		return (validated as { data: ResponseData<schema> }).data;
	}
}

const clients = new WeakMap<object, TeyvatHttpClient>();

export function _initialize_http_client(owner: object, cookies: CookieInput): void {
	clients.set(owner, new TeyvatHttpClient(cookies));
}

export function _get_http_client(owner: object): TeyvatHttpClient {
	const client = clients.get(owner);
	if (!client) throw new Error('Teyvat HTTP client has not been initialized');
	return client;
}
