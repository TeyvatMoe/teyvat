import { createHash as create_hash, randomBytes as random_bytes } from 'node:crypto';

const OVERSEAS_DS_SALT = '6s25p5ox5y14umn1p61aqyyvbvvl3lrt';
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';

export function _generate_overseas_ds(): string {
	const timestamp = Math.floor(Date.now() / 1000);
	const random = [...random_bytes(6)].map((value) => LETTERS[value % LETTERS.length]).join('');
	const hash = create_hash('md5').update(`salt=${OVERSEAS_DS_SALT}&t=${timestamp}&r=${random}`).digest('hex');
	return `${timestamp},${random},${hash}`;
}
