import { randomBytes } from 'node:crypto';
import { _encryptAppLoginCredential } from '#/auth/credentials.ts';
import {
	_hoyolabAppLogin,
	_hoyolabSendEmailCode,
	_hoyolabVerifyEmailCode,
	type HoyolabActionTicket,
	type HoyolabCaptcha,
} from '#/endpoints/hoyolab/auth.ts';
import {
	schemaTeyvatAuthCaptchaRequired,
	schemaTeyvatAuthCaptchaSolution,
	schemaTeyvatAuthEmailVerificationRequired,
	schemaTeyvatAuthenticated,
	type TeyvatAuthCaptchaSolution,
	type TeyvatAuthOptions,
	type TeyvatAuthResult,
	type TeyvatAuthSession,
} from '#/types/auth.ts';
import type { TeyvatLanguage } from '#/types/language.ts';
import { _hoyolabIdFromCookies } from '#/utils/cookies.ts';
import { TeyvatError } from './errors.ts';
import { TeyvatHttpClient } from './request.ts';

const DEVICE_ID_CHARACTERS = 'abcdefghijklmnopqrstuvwxyz0123456789';

function _deviceId(): string {
	return [...randomBytes(16)].map((value) => DEVICE_ID_CHARACTERS[value % DEVICE_ID_CHARACTERS.length]).join('');
}

type AuthState =
	| { status: 'ready' }
	| { status: 'captcha'; purpose: 'login'; captcha: HoyolabCaptcha; ticket?: HoyolabActionTicket }
	| { status: 'captcha'; purpose: 'email'; captcha: HoyolabCaptcha; ticket: HoyolabActionTicket }
	| { status: 'email'; ticket: HoyolabActionTicket; verified: boolean }
	| { status: 'finished' };

export class _TeyvatAuthSession implements TeyvatAuthSession {
	readonly #client: TeyvatHttpClient;
	readonly language: TeyvatLanguage;
	readonly #deviceId: string;
	readonly #deviceName?: string;
	readonly #deviceModel?: string;
	#account?: string;
	#password?: string;
	#state: AuthState = { status: 'ready' };
	#busy = false;

	constructor(options: TeyvatAuthOptions) {
		if (!options.account.trim()) throw new TeyvatError('account must not be empty');
		if (!options.password) throw new TeyvatError('password must not be empty');
		this.#account = options.account;
		this.#password = options.password;
		this.#client = new TeyvatHttpClient({}, { language: options.language });
		this.language = this.#client.language;
		if (options.deviceId !== undefined && !options.deviceId) throw new TeyvatError('deviceId must not be empty');
		this.#deviceId = options.deviceId ?? _deviceId();
		this.#deviceName = options.deviceName;
		this.#deviceModel = options.deviceModel;
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

	async completeCaptcha(solution: TeyvatAuthCaptchaSolution): Promise<TeyvatAuthResult> {
		return await this.#run(async () => {
			if (this.#state.status !== 'captcha')
				throw new TeyvatError('This authentication session is not awaiting a captcha');
			let validated: TeyvatAuthCaptchaSolution;
			try {
				validated = schemaTeyvatAuthCaptchaSolution.assert(solution);
			} catch {
				throw new TeyvatError('Invalid captcha solution');
			}
			if (validated.version !== this.#state.captcha.version) {
				throw new TeyvatError(`Expected a ${this.#state.captcha.version} captcha solution`);
			}
			if (validated.version === 'v4' && validated.captchaId !== this.#state.captcha.gt) {
				throw new TeyvatError('Captcha solution does not match the pending challenge');
			}

			const pending = this.#state;
			this.#state = { status: 'ready' };
			try {
				if (pending.purpose === 'login') {
					return await this.#login(
						{ ['session_id']: pending.captcha.session_id, solution: validated },
						pending.ticket,
					);
				}
				return await this.#sendEmail(pending.ticket, {
					['session_id']: pending.captcha.session_id,
					solution: validated,
				});
			} catch (cause) {
				if (this.#state.status === 'ready') this.#state = pending;
				throw cause;
			}
		});
	}

	async completeEmail(code: string): Promise<TeyvatAuthResult> {
		return await this.#run(async () => {
			if (this.#state.status !== 'email') {
				throw new TeyvatError('This authentication session is not awaiting an email verification code');
			}
			if (!this.#state.verified) {
				if (!code.trim()) throw new TeyvatError('email verification code must not be empty');
				await _hoyolabVerifyEmailCode(this.#client, this.#state.ticket, code);
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
		captcha?: { ['session_id']: string; solution: TeyvatAuthCaptchaSolution },
		ticket?: HoyolabActionTicket,
	): Promise<TeyvatAuthResult> {
		if (!this.#account || !this.#password)
			throw new TeyvatError('Authentication credentials are no longer available');
		const result = await _hoyolabAppLogin(this.#client, {
			account: _encryptAppLoginCredential(this.#account),
			password: _encryptAppLoginCredential(this.#password),
			deviceId: this.#deviceId,
			deviceName: this.#deviceName,
			deviceModel: this.#deviceModel,
			captcha,
			ticket,
		});

		if (result.status === 'captcha_required') return this.#loginCaptchaResult(result.captcha, ticket);
		if (result.status === 'email_verification_required') {
			return await this.#sendEmail(result.ticket);
		}

		const cookies = {
			stoken: result.stoken,
			['ltuid_v2']: result.aid,
			['ltmid_v2']: result.mid,
			['account_id_v2']: result.aid,
			['account_mid_v2']: result.mid,
		};
		_hoyolabIdFromCookies(cookies, result.aid);
		let authenticated: TeyvatAuthResult;
		try {
			authenticated = schemaTeyvatAuthenticated.assert({
				status: 'authenticated',
				hoyolabId: result.aid,
				deviceId: this.#deviceId,
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

	async #sendEmail(
		ticket: HoyolabActionTicket,
		captcha?: { ['session_id']: string; solution: TeyvatAuthCaptchaSolution },
	): Promise<TeyvatAuthResult> {
		const challenge = await _hoyolabSendEmailCode(this.#client, ticket, captcha);
		if (challenge) return this.#emailCaptchaResult(challenge, ticket);
		this.#state = { status: 'email', ticket, verified: false };
		try {
			return schemaTeyvatAuthEmailVerificationRequired.assert({ status: 'email_verification_required' });
		} catch {
			throw new TeyvatError('Invalid email verification state');
		}
	}

	#loginCaptchaResult(captcha: HoyolabCaptcha, ticket?: HoyolabActionTicket): TeyvatAuthResult {
		this.#state = { status: 'captcha', purpose: 'login', captcha, ticket };
		return this.#publicCaptchaResult(captcha);
	}

	#emailCaptchaResult(captcha: HoyolabCaptcha, ticket: HoyolabActionTicket): TeyvatAuthResult {
		this.#state = { status: 'captcha', purpose: 'email', captcha, ticket };
		return this.#publicCaptchaResult(captcha);
	}

	#publicCaptchaResult(captcha: HoyolabCaptcha): TeyvatAuthResult {
		const publicCaptcha =
			captcha.version === 'v3'
				? {
						version: 'v3' as const,
						gt: captcha.gt,
						challenge: captcha.challenge,
						newCaptcha: captcha.new_captcha,
						success: captcha.success,
					}
				: {
						version: 'v4' as const,
						captchaId: captcha.gt,
						riskType: captcha.risk_type,
						sessionId: captcha.session_id,
						newCaptcha: captcha.new_captcha,
						success: captcha.success,
					};
		try {
			return schemaTeyvatAuthCaptchaRequired.assert({ status: 'captcha_required', captcha: publicCaptcha });
		} catch {
			throw new TeyvatError('Invalid captcha challenge');
		}
	}

	async #run<Result>(operation: () => Promise<Result>): Promise<Result> {
		if (this.#busy) throw new TeyvatError('This authentication session already has an operation in progress');
		this.#busy = true;
		try {
			return await operation();
		} finally {
			this.#busy = false;
		}
	}
}
