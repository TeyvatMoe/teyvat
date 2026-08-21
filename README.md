# teyvat

A type-safe TypeScript library for Genshin Impact.

<a href="https://www.npmjs.com/package/teyvat"><img src="https://img.shields.io/npm/v/teyvat?maxAge=3600" alt="npm version" /></a>
<a href="https://www.npmjs.com/package/teyvat"><img src="https://img.shields.io/npm/dt/teyvat.svg?maxAge=3600" alt="npm downloads" /></a>

Teyvat turns HoYoLAB's raw APIs into a clean interface for reading and managing Genshin accounts. It handles cookies, authentication, response validation, pagination, and the usual upstream quirks for you.

Teyvat currently supports overseas Genshin accounts only.

[Documentation](https://lib.teyvat.moe) · [GitHub](https://github.com/TeyvatMoe/teyvat)

## Installation

```sh
bun add teyvat
```

```sh
npm install teyvat
```

Teyvat is an ESM-only, server-side library for current Node.js and Bun runtimes.

## Connecting an account

Most of Teyvat starts with a cookie-backed client. One client can discover every Genshin account connected to the same HoYoLAB account and keeps their authentication state together.

```ts
import { Teyvat } from 'teyvat';

const teyvat = new Teyvat({
	cookies: process.env.HOYOLAB_COOKIES!,
	autoEnable: true,
	onCookiesUpdate: async ({ hoyolabId, cookies }) => {
		await saveEncryptedSession(hoyolabId, cookies);
	},
});

const [account] = await teyvat.accounts();
if (!account) throw new Error('No Genshin accounts are bound');

const [info, characters, dailyNotes] = await Promise.all([
	account.info(),
	account.characters(),
	account.dailyNotes(),
]);
```

`autoEnable` is off by default. When enabled, Teyvat can turn on the HoYoLAB setting needed by a request, such as Battle Chronicle visibility, character details, real-time notes, or calculator synchronization. Because some of these settings make account information public on HoYoLAB, ask the account owner first.

Whenever `onCookiesUpdate` runs, save the new cookies securely. Teyvat can use a stored `stoken` to fill in or repair read-session cookies when they expire, but no credential lasts forever.

An account gives you profile and exploration data, achievements, inventory, detailed characters, Battle Chronicle showcase management, daily notes, the event calendar, Spiral Abyss, Imaginarium Theater, Stygian Onslaught, Envisaged Echoes, Traveler's Diary, enhancement calculations, and code redemption. The [API documentation](https://lib.teyvat.moe) has the complete return models.

## Authentication

If you do not already have cookies, Teyvat can run HoYoLAB's app login flow. The auth session remembers where it left off while your application presents any captcha challenge or asks the user for an email code.

> **Treat HoYoLAB cookies like passwords.** They may grant access to parts of the account that Teyvat never uses, including purchase-related services. Teyvat does not implement payment functionality and will never use cookies to make purchases. Never share or log these cookies, and always encrypt them when storing them.

```ts
const auth = Teyvat.auth({
	account: process.env.HOYOLAB_ACCOUNT!,
	password: process.env.HOYOLAB_PASSWORD!,
});

let result = await auth.login();

while (result.status !== 'authenticated') {
	result =
		result.status === 'captcha_required'
			? await auth.completeCaptcha(await solveCaptcha(result.captcha))
			: await auth.completeEmail(await readEmailCode());
}

await saveEncryptedSession({
	hoyolabId: result.hoyolabId,
	cookies: result.cookies,
	deviceId: result.deviceId,
});
```

Credentials and verification details stay inside the short-lived auth session and are cleared once authentication succeeds. Persist the returned cookies and device ID yourself; that lets the next process create an ordinary `Teyvat` client without logging in again.

## Daily check-in

```ts
const info = await teyvat.checkIn.info();

if (!info.signedIn) {
	const result = await teyvat.checkIn.claim();
	// A captcha_required result can be completed on the same checkIn client.
}

const history = await teyvat.checkIn.history({ limit: 10 }).all();
```

*Note: HoYoLAB exposes one check-in status and history across regions, not a separate ledger for each Genshin UID. History entries record the HoYoLAB check-in and do not identify which game accounts received each reward.*

## Wishes and transactions

Wish and transaction history use a separate authkey-scoped client. It never receives the main client's cookies and cannot renew an expired authkey.

```ts
const wishes = Teyvat.wishes({ authkey: process.env.GENSHIN_AUTHKEY! });

for await (const wish of wishes.history({ type: 'character' })) {
	console.log(wish.name, wish.rarity, wish.wishedAt);
}

const artifacts = await wishes.transactions({ type: 'artifact', limit: 20 }).all();
```

History is fetched lazily as you iterate. A paginator is single-use, and `.all()` is the convenient way to consume everything that remains.

## Language and errors

Pass `language` when constructing `Teyvat`, `Teyvat.auth()`, or `Teyvat.wishes()`. English (`en-us`) is the default, and the chosen language stays fixed for the lifetime of that client.

All public errors extend `TeyvatError`, with focused subclasses for transport failures, HoYoLAB API errors, and upstream responses that no longer match the expected shape. Teyvat validates those responses before they reach your application, so an unexpected API change fails clearly instead of quietly producing bad data.

Treat cookies, authkeys, passwords, and captcha solutions like any other account credential: never log or expose them, encrypt persisted sessions, and use Teyvat only in a trusted server environment.

## Acknowledgements

Thanks to the developers of [genshin.py](https://github.com/thesadru/genshin.py). Their work documenting HoYoLAB's APIs was a big help during Teyvat's early development.

## License

[MIT](./LICENSE)
