import { type } from 'arktype';

export const schema_teyvat_language = type.enumerated(
	'zh-cn',
	'zh-tw',
	'de-de',
	'en-us',
	'es-es',
	'fr-fr',
	'id-id',
	'it-it',
	'ja-jp',
	'ko-kr',
	'pt-pt',
	'ru-ru',
	'th-th',
	'tr-tr',
	'vi-vn',
);

/**
 * @useDeclaredType
 * @category Core
 */
export type TeyvatLanguage = typeof schema_teyvat_language.infer;
