import { basename, join } from 'node:path';
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
	deviceId: {
		get: () => db.inst.get<string>('device_id'),
		set: (deviceId: string) => db.inst.set('device_id', deviceId),
	},
};

const GEETEST_PORT = 5000;
const GEETEST_V3_SCRIPT = 'https://static.geetest.com/static/js/gt.0.5.0.js';
const GEETEST_V4_SCRIPT = 'https://static.geetest.com/v4/gt4.js';
let geetestRound = 0;

function authDebug(message: string): void {
	console.log(`[auth ${new Date().toISOString()}] ${message}`);
}

function geetestPage(captcha: TeyvatAuthCaptcha, round: number): string {
	const serializedCaptcha = JSON.stringify(captcha).replaceAll('<', '\\u003c');
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
			const captcha = ${serializedCaptcha};
			const status = document.querySelector('#status');
			let submitting = false;
			const initialize = captcha.version === 'v3' ? window.initGeetest : window.initGeetest4;
			const options = captcha.version === 'v3'
				? {
					gt: captcha.gt,
					challenge: captcha.challenge,
					new_captcha: captcha.newCaptcha,
					api_server: 'api-na.geetest.com',
					https: true,
					product: 'bind',
					lang: 'en',
				}
				: {
					captchaId: captcha.captchaId,
					riskType: captcha.riskType,
					userInfo: JSON.stringify({ session_id: captcha.sessionId }),
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
							? {
								version: 'v3',
								geetestChallenge: validation.geetest_challenge,
								geetestValidate: validation.geetest_validate,
								geetestSeccode: validation.geetest_seccode,
							}
							: {
								version: 'v4',
								captchaId: captcha.captchaId,
								lotNumber: validation.lot_number,
								passToken: validation.pass_token,
								genTime: validation.gen_time,
								captchaOutput: validation.captcha_output,
							};
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

async function solveGeetest(captcha: TeyvatAuthCaptcha): Promise<TeyvatAuthCaptchaSolution> {
	const round = ++geetestRound;
	const port = GEETEST_PORT + round - 1;
	authDebug(`captcha round ${round}: preparing Geetest ${captcha.version}`);
	let resolveSolution: (solution: TeyvatAuthCaptchaSolution) => void;
	const solution = new Promise<TeyvatAuthCaptchaSolution>((resolve) => {
		resolveSolution = resolve;
	});
	const scriptUrl = captcha.version === 'v3' ? GEETEST_V3_SCRIPT : GEETEST_V4_SCRIPT;
	let submitted = false;

	const app = new Elysia()
		.get('/', () => {
			authDebug(`captcha round ${round}: browser loaded the challenge page`);
			return new Response(geetestPage(captcha, round), {
				headers: {
					'cache-control': 'no-store',
					'content-type': 'text/html; charset=utf-8',
				},
			});
		})
		.get('/geetest.js', async () => {
			authDebug(`captcha round ${round}: proxying the Geetest script`);
			const response = await fetch(scriptUrl);
			return new Response(response.body, {
				status: response.status,
				headers: { 'content-type': 'text/javascript; charset=utf-8' },
			});
		})
		.post('/solution', ({ body, set }) => {
			authDebug(`captcha round ${round}: received a browser submission`);
			if (submitted) {
				authDebug(`captcha round ${round}: ignored a duplicate browser submission`);
				return { accepted: false };
			}
			if (typeof body !== 'object' || body === null) {
				authDebug(`captcha round ${round}: rejected a non-object request body`);
				set.status = 400;
				return { accepted: false, message: 'The submitted solution was not valid JSON' };
			}
			submitted = true;
			authDebug(`captcha round ${round}: accepted the submission and resolved the pending solver`);
			resolveSolution(body as TeyvatAuthCaptchaSolution);
			return { accepted: true };
		})
		.listen({ hostname: '127.0.0.1', port });

	authDebug(`captcha round ${round}: listening at http://127.0.0.1:${port}`);
	try {
		const result = await solution;
		authDebug(`captcha round ${round}: solver promise resolved`);
		await Bun.sleep(300);
		return result;
	} finally {
		authDebug(`captcha round ${round}: stopping the local server`);
		await app.stop();
		authDebug(`captcha round ${round}: local server stopped`);
	}
}

async function promptForEmailCode(): Promise<string> {
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
		deviceId: (await db.deviceId.get()) ?? undefined,
	});
	authDebug('starting app login');
	let result: TeyvatAuthResult = await auth.login();
	authDebug(`app login returned status ${result.status}`);

	while (result.status !== 'authenticated') {
		if (result.status === 'captcha_required') {
			const solution = await solveGeetest(result.captcha);
			authDebug(`captcha round ${geetestRound}: sending the solution to HoYoLAB`);
			result = await auth.completeCaptcha(solution);
			authDebug(`captcha round ${geetestRound}: HoYoLAB returned status ${result.status}`);
		} else {
			authDebug('waiting for the email verification code');
			result = await auth.completeEmail(await promptForEmailCode());
			authDebug(`email verification returned status ${result.status}`);
		}
	}

	authDebug('authentication completed; persisting the session');
	await Promise.all([db.cookies.set(result.cookies), db.deviceId.set(result.deviceId)]);
	authDebug('authenticated session persisted');
	return result.cookies;
}

const cookies = (await db.cookies.get()) ?? (await login());
const teyvat = new Teyvat({
	cookies,
	autoEnable: true,
	onCookiesUpdate: async ({ cookies: updatedCookies }) => {
		await db.cookies.set(updatedCookies);
	},
});

const accounts = await teyvat.accounts();
const account = accounts[0];
if (!account) throw new Error('No overseas Genshin accounts are bound to these cookies');

async function _calculatorResult() {
	const characters = await account.calculator.characters();
	const character = characters[0];
	if (!character) return { characters, character: null, calculation: null };
	const details = await account.calculator.character(character.id);
	const calculation = await account.calculator.calculate({
		character: {
			id: character.id,
			currentLevel: character.currentLevel,
			targetLevel: character.maximumLevel,
		},
	});
	return { characters, character: details, calculation };
}

function _makeTask<T extends string, R>(name: T, cb: () => Promise<R>) {
	const file = Bun.file(join(import.meta.dir, 'results', `${name}.json`));

	return async () => {
		const res = await cb();
		console.log(`[test~${name}] writing to ${file.name ? basename(file.name) : 'N/A'}`);
		await file.write(JSON.stringify(res, null, '\t'));
	};
}

const tasks = [
	_makeTask('info', () => account.info()),
	_makeTask('achievements', () => account.achievements()),
	_makeTask('inventory', () => account.inventory()),
	_makeTask('current_spiral_abyss', () => account.spiralAbyss()),
	_makeTask('previous_spiral_abyss', () => account.spiralAbyss({ period: 'previous' })),
	_makeTask('characters', () => account.characters()),
	_makeTask('showcase', () => account.showcase()),
	_makeTask('daily_notes', () => account.dailyNotes()),
	_makeTask('envisaged_echoes', () => account.envisagedEchoes()),
	_makeTask('imaginarium_theater', () => account.imaginariumTheater()),
	_makeTask('stygian_onslaught', () => account.stygianOnslaught()),
	_makeTask('traveler_diary', () => account.travelerDiary()),
	_makeTask('traveler_diary_primogems', () => account.travelerDiaryLog().all()),
	_makeTask('traveler_diary_mora', () => account.travelerDiaryLog({ currency: 'mora' }).all()),
	_makeTask('calendar', () => account.calendar()),
	_makeTask('calculator', _calculatorResult),
	_makeTask('check_in', async () => ({
		info: await teyvat.checkIn.info(),
		history: await teyvat.checkIn.history().all(),
	})),
];

for (const task of tasks) await task();
