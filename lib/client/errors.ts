/** @category Errors */
export class TeyvatError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options);
		this.name = new.target.name;
	}
}

/** @category Errors */
export type TeyvatRequestErrorKind = 'network' | 'timeout' | 'http' | 'json' | 'body';

/** @category Errors */
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

/** @category Errors */
export class TeyvatApiError extends TeyvatError {
	readonly retcode: number;
	readonly upstream_message: string;
	readonly method: string;
	readonly endpoint: string;

	constructor(retcode: number, upstream_message: string, method: string, endpoint: string) {
		super(`HoYoLAB request failed [${retcode}]: ${upstream_message || 'Unknown API error'}`);
		this.retcode = retcode;
		this.upstream_message = upstream_message;
		this.method = method;
		this.endpoint = endpoint;
	}
}

/** @category Code Redemption */
export class TeyvatCodeRedemptionError extends TeyvatApiError {
	readonly reason:
		| 'invalid'
		| 'expired'
		| 'malformed'
		| 'usage_limit_reached'
		| 'not_active'
		| 'region_locked'
		| 'cooldown'
		| 'already_redeemed'
		| 'level_too_low';

	constructor(reason: TeyvatCodeRedemptionError['reason'], retcode: number, endpoint: string) {
		super(retcode, `Code redemption failed: ${reason.replaceAll('_', ' ')}`, 'GET', endpoint);
		this.reason = reason;
	}
}

/** @category Errors */
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
