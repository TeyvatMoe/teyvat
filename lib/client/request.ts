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
	timeoutMs?: number;
}

function buildUrl(domain: TeyvatDomain, path: string, params?: Readonly<Record<string, QueryValue>>): URL {
	const base = domain.endsWith('/') ? domain : `${domain}/`;
	const url = new URL(path.replace(/^\/+/, ''), base);

	for (const [name, value] of Object.entries(params ?? {})) {
		if (value !== null && value !== undefined) url.searchParams.set(name, String(value));
	}

	return url;
}

function safeEndpoint(url: URL): string {
	return `${url.origin}${url.pathname}`;
}

function validationIssues(cause: unknown): string[] {
	if (cause instanceof Error && cause.message) return [cause.message];
	return [String(cause)];
}

export class TeyvatHttpClient {
	readonly cookies: CookieJar;
	readonly #fetch: Fetch;
	readonly #timeoutMs: number;

	constructor(cookies: CookieInput, options: TeyvatHttpClientOptions = {}) {
		this.cookies = new CookieJar(cookies);
		this.#fetch = options.fetch ?? globalThis.fetch;
		this.#timeoutMs = options.timeoutMs ?? 30_000;

		if (!Number.isFinite(this.#timeoutMs) || this.#timeoutMs <= 0) {
			throw new RangeError('timeoutMs must be a positive finite number');
		}
	}

	async request<schema extends Type>(options: TeyvatRequestOptions<schema>): Promise<ResponseData<schema>> {
		const method = (options.method ?? 'GET').toUpperCase();
		const url = buildUrl(options.domain, options.path, options.params);
		const endpoint = safeEndpoint(url);
		const headers = new Headers(options.headers);
		if (!headers.has('Accept')) headers.set('Accept', 'application/json');

		const cookieHeader = this.cookies.toHeader();
		if (cookieHeader) headers.set('Cookie', cookieHeader);

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

		this.cookies.updateFromResponse(response.headers);

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
				const upstreamMessage = 'message' in raw && typeof raw.message === 'string' ? raw.message : '';
				throw new TeyvatApiError(raw.retcode, upstreamMessage, method, endpoint);
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
			throw new TeyvatResponseValidationError(method, endpoint, validationIssues(cause), { cause });
		}

		return (validated as { data: ResponseData<schema> }).data;
	}
}

const clients = new WeakMap<object, TeyvatHttpClient>();

export function initializeHttpClient(owner: object, cookies: CookieInput): void {
	clients.set(owner, new TeyvatHttpClient(cookies));
}

export function getHttpClient(owner: object): TeyvatHttpClient {
	const client = clients.get(owner);
	if (!client) throw new Error('Teyvat HTTP client has not been initialized');
	return client;
}
