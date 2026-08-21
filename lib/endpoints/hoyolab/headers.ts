import { _generateOverseasDs } from '#/auth/ds.ts';
import type { TeyvatLanguage } from '#/types/language.ts';

const USER_AGENT =
	'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36';

export function _hoyolabHeaders(language: TeyvatLanguage): Record<string, string> {
	return {
		['DS']: _generateOverseasDs(),
		'User-Agent': USER_AGENT,
		'x-rpc-app_version': '1.5.0',
		'x-rpc-client_type': '5',
		'x-rpc-lang': language,
		'x-rpc-language': language,
	};
}
