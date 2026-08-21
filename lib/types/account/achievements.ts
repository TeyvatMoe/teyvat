import { type } from 'arktype';

const schema_category = type({
	id: 'string',
	name: 'string',
	icon: 'string',
	completed: 'number.integer >= 0',
	completion_percentage: '0 <= number <= 100 | null',
});

export const schema_teyvat_account_achievements = type({
	completed: 'number.integer >= 0',
	categories: schema_category.array(),
});

/**
 * Category-level achievement progress reported by HoYoLAB.
 *
 * @interface
 * @useDeclaredType
 * @category Achievements
 */
export type TeyvatAccountAchievements = typeof schema_teyvat_account_achievements.infer;
