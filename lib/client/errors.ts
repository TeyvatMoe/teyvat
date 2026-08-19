export class TeyvatError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = new.target.name;
	}
}

export type TeyvatRequestErrorKind = 'network' | 'timeout' | 'http' | 'json' | 'body';

export class TeyvatRequestError extends TeyvatError {
	readonly kind: TeyvatRequestErrorKind;
	readonly method: string;
	readonly endpoint: string;
	readonly status?: number;

	constructor(
		kind: TeyvatRequestErrorKind,
		method: string,
		endpoint: string,
		message: string,
		options?: ErrorOptions & { status?: number },
	) {
		super(message, options);
		this.kind = kind;
		this.method = method;
		this.endpoint = endpoint;
		this.status = options?.status;
	}
}

export class TeyvatApiError extends TeyvatError {
	readonly retcode: number;
	readonly upstreamMessage: string;
	readonly method: string;
	readonly endpoint: string;

	constructor(retcode: number, upstreamMessage: string, method: string, endpoint: string) {
		super(`HoYoLAB request failed [${retcode}]: ${upstreamMessage || 'Unknown API error'}`);
		this.retcode = retcode;
		this.upstreamMessage = upstreamMessage;
		this.method = method;
		this.endpoint = endpoint;
	}
}

export class TeyvatResponseValidationError extends TeyvatError {
	readonly method: string;
	readonly endpoint: string;
	readonly issues: readonly string[];

	constructor(method: string, endpoint: string, issues: readonly string[], options?: ErrorOptions) {
		super(`Invalid HoYoLAB response for ${method} ${endpoint}: ${issues.join('; ')}`, options);
		this.method = method;
		this.endpoint = endpoint;
		this.issues = issues;
	}
}
