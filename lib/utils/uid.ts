import { TeyvatError } from '#/client/errors.ts';
import type { TeyvatServer } from '#/types/account/server.ts';

const SERVER_PREFIXES: Readonly<Record<string, TeyvatServer>> = {
	'6': 'os_usa',
	'7': 'os_euro',
	'8': 'os_asia',
	'9': 'os_cht',
	'18': 'os_asia',
};

export function _recognizeGenshinServer(uid: number): TeyvatServer {
	if (!Number.isSafeInteger(uid) || uid <= 0) throw new TeyvatError(`Invalid Genshin UID: ${uid}`);

	const value = String(uid);
	if (value.length < 9) throw new TeyvatError(`Unsupported Genshin UID: ${uid}`);

	const server = SERVER_PREFIXES[value.slice(0, -8)];
	if (!server) throw new TeyvatError(`Unsupported Genshin UID: ${uid}`);
	return server;
}
