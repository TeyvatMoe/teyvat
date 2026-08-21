import { type } from 'arktype';

const schemaCategory = type({
	id: 'string',
	name: 'string',
	icon: 'string',
	completed: 'number.integer >= 0',
	completionPercentage: '0 <= number <= 100 | null',
});

export const schemaTeyvatAccountAchievements = type({
	completed: 'number.integer >= 0',
	categories: schemaCategory.array(),
});

/**
 * Category-level achievement progress reported by HoYoLAB.
 *
 * @interface
 * @useDeclaredType
 * @category Achievements
 */
export type TeyvatAccountAchievements = typeof schemaTeyvatAccountAchievements.infer;
