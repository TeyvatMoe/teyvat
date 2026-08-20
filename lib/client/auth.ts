import { randomBytes as random_bytes } from 'node:crypto';
import { _encrypt_app_login_credential } from '../auth/credentials.ts';
import {
	_hoyolab_app_login,
	_hoyolab_send_email_code,
	_hoyolab_verify_email_code,
	type HoyolabActionTicket,
	type HoyolabCaptcha,
} from '../endpoints/hoyolab/auth.ts';
import {
	schema_teyvat_auth_captcha_required,
	schema_teyvat_auth_captcha_solution,
	schema_teyvat_auth_email_verification_required,
	schema_teyvat_authenticated,
	type TeyvatAuthCaptchaSolution,
	type TeyvatAuthOptions,
	type TeyvatAuthResult,
	type TeyvatAuthSession,
} from '../types/auth.ts';
import { _hoyolab_id_from_cookies } from '../utils/cookies.ts';
import { TeyvatError } from './errors.ts';
import { TeyvatHttpClient } from './request.ts';

const DEVICE_ID_CHARACTERS = 'abcdefghijklmnopqrstuvwxyz0123456789';

function _device_id(): string {
	return [...random_bytes(16)].map((value) => DEVICE_ID_CHARACTERS[value % DEVICE_ID_CHARACTERS.length]).join('');
}

type AuthState =
	| { status: 'ready' }
	| { status: 'captcha'; purpose: 'login'; captcha: HoyolabCaptcha; ticket?: HoyolabActionTicket }
	| { status: 'captcha'; purpose: 'email'; captcha: HoyolabCaptcha; ticket: HoyolabActionTicket }
	| { status: 'email'; ticket: HoyolabActionTicket; verified: boolean }
	| { status: 'finished' };

export class _TeyvatAuthSession implements TeyvatAuthSession {
	readonly #client = new TeyvatHttpClient({});
	readonly #device_id: string;
	readonly #device_name?: string;
	readonly #device_model?: string;
	#account?: string;
	#password?: string;
	#state: AuthState = { status: 'ready' };
	#busy = false;

	constructor(options: TeyvatAuthOptions) {
		if (!options.account.trim()) throw new TeyvatError('account must not be empty');
		if (!options.password) throw new TeyvatError('password must not be empty');
		this.#account = options.account;
		this.#password = options.password;
		if (options.device_id !== undefined && !options.device_id) throw new TeyvatError('device_id must not be empty');
		this.#device_id = options.device_id ?? _device_id();
		this.#device_name = options.device_name;
		this.#device_model = options.device_model;
	}

	async login(): Promise<TeyvatAuthResult> {
		return await this.#run(async () => {
			if (this.#state.status === 'finished')
				throw new TeyvatError('This authentication session has already finished');
			if (this.#state.status !== 'ready')
				throw new TeyvatError('This authentication session is awaiting verification');
			return await this.#login();
		});
	}

	async complete_captcha(solution: TeyvatAuthCaptchaSolution): Promise<TeyvatAuthResult> {
		return await this.#run(async () => {
			if (this.#state.status !== 'captcha')
				throw new TeyvatError('This authentication session is not awaiting a captcha');
			let validated: TeyvatAuthCaptchaSolution;
			try {
				validated = schema_teyvat_auth_captcha_solution.assert(solution);
			} catch {
				throw new TeyvatError('Invalid captcha solution');
			}
			if (validated.version !== this.#state.captcha.version) {
				throw new TeyvatError(`Expected a ${this.#state.captcha.version} captcha solution`);
			}
			if (validated.version === 'v3' && validated.geetest_challenge !== this.#state.captcha.challenge) {
				throw new TeyvatError('Captcha solution does not match the pending challenge');
			}
			if (validated.version === 'v4' && validated.captcha_id !== this.#state.captcha.gt) {
				throw new TeyvatError('Captcha solution does not match the pending challenge');
			}

			const pending = this.#state;
			this.#state = { status: 'ready' };
			try {
				if (pending.purpose === 'login') {
					return await this.#login(
						{ session_id: pending.captcha.session_id, solution: validated },
						pending.ticket,
					);
				}
				return await this.#send_email(pending.ticket, {
					session_id: pending.captcha.session_id,
					solution: validated,
				});
			} catch (cause) {
				if (this.#state.status === 'ready') this.#state = pending;
				throw cause;
			}
		});
	}

	async complete_email(code: string): Promise<TeyvatAuthResult> {
		return await this.#run(async () => {
			if (this.#state.status !== 'email') {
				throw new TeyvatError('This authentication session is not awaiting an email verification code');
			}
			if (!this.#state.verified) {
				if (!code.trim()) throw new TeyvatError('email verification code must not be empty');
				await _hoyolab_verify_email_code(this.#client, this.#state.ticket, code);
				this.#state = { ...this.#state, verified: true };
			}

			const verified = this.#state;
			try {
				return await this.#login(undefined, verified.ticket);
			} catch (cause) {
				if (this.#state.status === 'email') this.#state = verified;
				throw cause;
			}
		});
	}

	async #login(
		captcha?: { session_id: string; solution: TeyvatAuthCaptchaSolution },
		ticket?: HoyolabActionTicket,
	): Promise<TeyvatAuthResult> {
		if (!this.#account || !this.#password)
			throw new TeyvatError('Authentication credentials are no longer available');
		const result = await _hoyolab_app_login(this.#client, {
			account: _encrypt_app_login_credential(this.#account),
			password: _encrypt_app_login_credential(this.#password),
			device_id: this.#device_id,
			device_name: this.#device_name,
			device_model: this.#device_model,
			captcha,
			ticket,
		});

		if (result.status === 'captcha_required') return this.#login_captcha_result(result.captcha, ticket);
		if (result.status === 'email_verification_required') {
			return await this.#send_email(result.ticket);
		}

		const cookies = {
			stoken: result.stoken,
			ltuid_v2: result.aid,
			ltmid_v2: result.mid,
			account_id_v2: result.aid,
			account_mid_v2: result.mid,
		};
		_hoyolab_id_from_cookies(cookies, result.aid);
		let authenticated: TeyvatAuthResult;
		try {
			authenticated = schema_teyvat_authenticated.assert({
				status: 'authenticated',
				hoyolab_id: result.aid,
				device_id: this.#device_id,
				cookies,
			});
		} catch {
			throw new TeyvatError('Invalid authenticated session');
		}
		this.#state = { status: 'finished' };
		this.#account = undefined;
		this.#password = undefined;
		return authenticated;
	}

	async #send_email(
		ticket: HoyolabActionTicket,
		captcha?: { session_id: string; solution: TeyvatAuthCaptchaSolution },
	): Promise<TeyvatAuthResult> {
		const challenge = await _hoyolab_send_email_code(this.#client, ticket, captcha);
		if (challenge) return this.#email_captcha_result(challenge, ticket);
		this.#state = { status: 'email', ticket, verified: false };
		try {
			return schema_teyvat_auth_email_verification_required.assert({ status: 'email_verification_required' });
		} catch {
			throw new TeyvatError('Invalid email verification state');
		}
	}

	#login_captcha_result(captcha: HoyolabCaptcha, ticket?: HoyolabActionTicket): TeyvatAuthResult {
		this.#state = { status: 'captcha', purpose: 'login', captcha, ticket };
		return this.#public_captcha_result(captcha);
	}

	#email_captcha_result(captcha: HoyolabCaptcha, ticket: HoyolabActionTicket): TeyvatAuthResult {
		this.#state = { status: 'captcha', purpose: 'email', captcha, ticket };
		return this.#public_captcha_result(captcha);
	}

	#public_captcha_result(captcha: HoyolabCaptcha): TeyvatAuthResult {
		const public_captcha =
			captcha.version === 'v3'
				? {
						version: 'v3' as const,
						gt: captcha.gt,
						challenge: captcha.challenge,
						new_captcha: captcha.new_captcha,
						success: captcha.success,
					}
				: {
						version: 'v4' as const,
						captcha_id: captcha.gt,
						risk_type: captcha.risk_type,
						new_captcha: captcha.new_captcha,
						success: captcha.success,
					};
		try {
			return schema_teyvat_auth_captcha_required.assert({ status: 'captcha_required', captcha: public_captcha });
		} catch {
			throw new TeyvatError('Invalid captcha challenge');
		}
	}

	async #run<result>(operation: () => Promise<result>): Promise<result> {
		if (this.#busy) throw new TeyvatError('This authentication session already has an operation in progress');
		this.#busy = true;
		try {
			return await operation();
		} finally {
			this.#busy = false;
		}
	}
}
