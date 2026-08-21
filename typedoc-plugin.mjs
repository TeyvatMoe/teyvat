export function load(app) {
	app.converter.on('resolveEnd', (context) => {
		for (const reflection of Object.values(context.project.reflections)) {
			if (reflection.defaultValue?.includes('schema_teyvat_')) reflection.defaultValue = undefined;
		}
	});
}
