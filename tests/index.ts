import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';
import arkenv from 'arkenv';
import { BunDB } from 'bun.db';
import { Elysia } from 'elysia';
import {
	Teyvat,
	type TeyvatAuthCaptcha,
	type TeyvatAuthCaptchaSolution,
	type TeyvatAuthResult,
	type TeyvatCookies,
} from '../lib/index.ts';

const env = arkenv({
	'TEST_USERNAME?': 'string',
	'TEST_PASSWORD?': 'string',
});

const db = {
	inst: new BunDB(join(import.meta.dir, 'test.sqlite')),
	cookies: {
		get: () => db.inst.get<TeyvatCookies>('cookies'),
		set: (cookies: TeyvatCookies) => db.inst.set('cookies', cookies),
	},
	device_id: {
		get: () => db.inst.get<string>('device_id'),
		set: (device_id: string) => db.inst.set('device_id', device_id),
	},
};

const GEETEST_PORT = 5000;
const GEETEST_V3_SCRIPT = 'https://static.geetest.com/static/js/gt.0.5.0.js';
const GEETEST_V4_SCRIPT = 'https://static.geetest.com/v4/gt4.js';
let geetest_round = 0;

function auth_debug(message: string): void {
	console.log(`[auth ${new Date().toISOString()}] ${message}`);
}

function geetest_page(captcha: TeyvatAuthCaptcha, round: number): string {
	const serialized_captcha = JSON.stringify(captcha).replaceAll('<', '\\u003c');
	return `<!doctype html>
<html lang="en">
	<head>
		<meta charset="utf-8" />
		<meta name="referrer" content="no-referrer" />
		<meta name="viewport" content="width=device-width, initial-scale=1" />
		<title>Teyvat authentication</title>
		<style>
			:root { color-scheme: dark; font-family: system-ui, sans-serif; }
			body { min-height: 100vh; margin: 0; display: grid; place-items: center; background: #111318; color: #f5f7ff; }
			main { width: min(32rem, calc(100% - 3rem)); padding: 2rem; border: 1px solid #303541; border-radius: 1rem; background: #1a1e26; }
			h1 { margin-top: 0; font-size: 1.35rem; }
			p { color: #b9c0cf; line-height: 1.5; }
		</style>
	</head>
	<body>
		<main>
			<h1>HoYoLAB verification</h1>
			<p id="status">Loading Geetest…</p>
		</main>
		<script src="/geetest.js?round=${round}"></script>
		<script>
			const captcha = ${serialized_captcha};
			const status = document.querySelector('#status');
			let submitting = false;
			const initialize = captcha.version === 'v3' ? window.initGeetest : window.initGeetest4;
			const options = captcha.version === 'v3'
				? {
					gt: captcha.gt,
					challenge: captcha.challenge,
					new_captcha: captcha.new_captcha,
					api_server: 'api-na.geetest.com',
					https: true,
					product: 'bind',
					lang: 'en',
				}
				: {
					captchaId: captcha.captcha_id,
					riskType: captcha.risk_type,
					userInfo: JSON.stringify({ session_id: captcha.session_id }),
					apiServers: ['gcaptcha4.captchami.com'],
					product: 'bind',
					language: 'en',
				};

			initialize(options, (widget) => {
				widget.onReady(() => captcha.version === 'v3' ? widget.verify() : widget.showCaptcha());
				widget.onError((error) => {
					status.textContent = 'Geetest failed. Check the browser console.';
					console.error(error);
				});
				widget.onSuccess(async () => {
					if (submitting) return;
					submitting = true;
					status.textContent = 'Submitting verification…';
					try {
						const validation = widget.getValidate();
						const solution = captcha.version === 'v3'
							? { version: 'v3', ...validation }
							: { version: 'v4', captcha_id: captcha.captcha_id, ...validation };
						const response = await fetch('/solution?round=${round}', {
							method: 'POST',
							headers: { 'content-type': 'application/json' },
							body: JSON.stringify(solution),
						});
						const result = await response.json();
						if (!response.ok) throw new Error(result.message || ('HTTP ' + response.status));
						status.textContent = result.accepted
							? 'Solution accepted locally. Waiting for HoYoLAB; check the terminal.'
							: 'This captcha round was already submitted. Wait for the terminal before refreshing.';
					} catch (error) {
						submitting = false;
						status.textContent = 'Could not submit verification: ' + error.message;
						console.error(error);
					}
				});
			});
		</script>
	</body>
</html>`;
}

async function solve_geetest(captcha: TeyvatAuthCaptcha): Promise<TeyvatAuthCaptchaSolution> {
	const round = ++geetest_round;
	const port = GEETEST_PORT + round - 1;
	auth_debug(`captcha round ${round}: preparing Geetest ${captcha.version}`);
	let resolve_solution: (solution: TeyvatAuthCaptchaSolution) => void;
	const solution = new Promise<TeyvatAuthCaptchaSolution>((resolve) => {
		resolve_solution = resolve;
	});
	const script_url = captcha.version === 'v3' ? GEETEST_V3_SCRIPT : GEETEST_V4_SCRIPT;
	let submitted = false;

	const app = new Elysia()
		.get('/', () => {
			auth_debug(`captcha round ${round}: browser loaded the challenge page`);
			return new Response(geetest_page(captcha, round), {
				headers: {
					'cache-control': 'no-store',
					'content-type': 'text/html; charset=utf-8',
				},
			});
		})
		.get('/geetest.js', async () => {
			auth_debug(`captcha round ${round}: proxying the Geetest script`);
			const response = await fetch(script_url);
			return new Response(response.body, {
				status: response.status,
				headers: { 'content-type': 'text/javascript; charset=utf-8' },
			});
		})
		.post('/solution', ({ body, set }) => {
			auth_debug(`captcha round ${round}: received a browser submission`);
			if (submitted) {
				auth_debug(`captcha round ${round}: ignored a duplicate browser submission`);
				return { accepted: false };
			}
			if (typeof body !== 'object' || body === null) {
				auth_debug(`captcha round ${round}: rejected a non-object request body`);
				set.status = 400;
				return { accepted: false, message: 'The submitted solution was not valid JSON' };
			}
			submitted = true;
			auth_debug(`captcha round ${round}: accepted the submission and resolved the pending solver`);
			resolve_solution(body as TeyvatAuthCaptchaSolution);
			return { accepted: true };
		})
		.listen({ hostname: '127.0.0.1', port });

	auth_debug(`captcha round ${round}: listening at http://127.0.0.1:${port}`);
	try {
		const result = await solution;
		auth_debug(`captcha round ${round}: solver promise resolved`);
		await Bun.sleep(300);
		return result;
	} finally {
		auth_debug(`captcha round ${round}: stopping the local server`);
		await app.stop();
		auth_debug(`captcha round ${round}: local server stopped`);
	}
}

async function prompt_for_email_code(): Promise<string> {
	const readline = createInterface({ input: process.stdin, output: process.stdout });
	try {
		return await readline.question('Enter the HoYoLAB email verification code: ');
	} finally {
		readline.close();
	}
}

async function login(): Promise<TeyvatCookies> {
	if (!env.TEST_USERNAME || !env.TEST_PASSWORD) {
		throw new Error('TEST_USERNAME and TEST_PASSWORD are required when no saved cookies exist');
	}

	const auth = Teyvat.auth({
		account: env.TEST_USERNAME,
		password: env.TEST_PASSWORD,
		device_id: (await db.device_id.get()) ?? undefined,
	});
	auth_debug('starting app login');
	let result: TeyvatAuthResult = await auth.login();
	auth_debug(`app login returned status ${result.status}`);

	while (result.status !== 'authenticated') {
		if (result.status === 'captcha_required') {
			const solution = await solve_geetest(result.captcha);
			auth_debug(`captcha round ${geetest_round}: sending the solution to HoYoLAB`);
			result = await auth.complete_captcha(solution);
			auth_debug(`captcha round ${geetest_round}: HoYoLAB returned status ${result.status}`);
		} else {
			auth_debug('waiting for the email verification code');
			result = await auth.complete_email(await prompt_for_email_code());
			auth_debug(`email verification returned status ${result.status}`);
		}
	}

	auth_debug('authentication completed; persisting the session');
	await Promise.all([db.cookies.set(result.cookies), db.device_id.set(result.device_id)]);
	auth_debug('authenticated session persisted');
	return result.cookies;
}

const cookies = (await db.cookies.get()) ?? (await login());
const teyvat = new Teyvat({
	cookies,
	on_cookies_update: async ({ cookies: updated_cookies }) => {
		await db.cookies.set(updated_cookies);
	},
});

const accounts = await teyvat.accounts();
const account = accounts[0];
if (!account) throw new Error('No overseas Genshin accounts are bound to these cookies');

const info = await account.info();
console.log({ info });
const current_spiral_abyss = await account.spiral_abyss();
console.log({ current_spiral_abyss });
const previous_spiral_abyss = await account.spiral_abyss({ period: 'previous' });
console.log({ previous_spiral_abyss });
const characters = await account.characters({ auto_enable: true });
console.log({ characters });
const daily_notes = await account.daily_notes({ auto_enable: true });
console.log({ daily_notes });
const exploration = await account.exploration({ auto_enable: true });
console.log({ exploration });
