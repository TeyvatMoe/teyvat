import { createHash as create_hash, randomBytes as random_bytes } from 'node:crypto';

const OVERSEAS_DS_SALT = '6s25p5ox5y14umn1p61aqyyvbvvl3lrt';
const APP_LOGIN_DS_SALT = 'IZPgfb0dRPtBeLuFkdDznSZ6f4wWt6y2';
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
const LETTERS_AND_DIGITS = `${LETTERS}0123456789`;

export function _generate_overseas_ds(): string {
	const timestamp = Math.floor(Date.now() / 1000);
	const random = [...random_bytes(6)].map((value) => LETTERS[value % LETTERS.length]).join('');
	const hash = create_hash('md5').update(`salt=${OVERSEAS_DS_SALT}&t=${timestamp}&r=${random}`).digest('hex');
	return `${timestamp},${random},${hash}`;
}

export function _generate_app_login_ds(body: unknown): string {
	const timestamp = Math.floor(Date.now() / 1000);
	const random = [...random_bytes(6)].map((value) => LETTERS_AND_DIGITS[value % LETTERS_AND_DIGITS.length]).join('');
	const serialized_body = JSON.stringify(body);
	const hash = create_hash('md5')
		.update(`salt=${APP_LOGIN_DS_SALT}&t=${timestamp}&r=${random}&b=${serialized_body}&q=`)
		.digest('hex');
	return `${timestamp},${random},${hash}`;
}

export function _generate_app_token_ds(): string {
	const timestamp = Math.floor(Date.now() / 1000);
	const random = [...random_bytes(6)].map((value) => LETTERS[value % LETTERS.length]).join('');
	const hash = create_hash('md5').update(`salt=${APP_LOGIN_DS_SALT}&t=${timestamp}&r=${random}`).digest('hex');
	return `${timestamp},${random},${hash}`;
}
