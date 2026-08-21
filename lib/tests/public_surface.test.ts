import { describe, expect, test } from 'bun:test';

describe('source public surface', () => {
	test('keeps raw HoYoLAB schemas file-local', async () => {
		const exportedSchemas: string[] = [];
		const files = new Bun.Glob('lib/endpoints/**/*.ts');
		for await (const file of files.scan({ cwd: process.cwd(), absolute: true })) {
			const source = await Bun.file(file).text();
			if (/^export const schemaHoyolab/m.test(source)) exportedSchemas.push(file);
		}
		expect(exportedSchemas).toEqual([]);
	});

	test('keeps all focused public models in the TypeDoc category order', async () => {
		const config = (await Bun.file('typedoc.json').json()) as { categoryOrder: string[] };
		for (const category of [
			'Authentication',
			'Characters',
			'Character Showcase',
			'Envisaged Echoes',
			'Enhancement Calculator',
			'Spiral Abyss',
		]) {
			expect(config.categoryOrder).toContain(category);
		}
	});
});
