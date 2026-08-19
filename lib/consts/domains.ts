export const TEYVAT_DOMAINS = {
	hoyolabBbs: 'https://bbs-api-os.hoyolab.com/',
	hoyolabTakumi: 'https://api-os-takumi.mihoyo.com/',
	genshinRecord: 'https://sg-public-api.hoyolab.com/event/game_record/genshin/api/',
} as const;

export type TeyvatDomain = (typeof TEYVAT_DOMAINS)[keyof typeof TEYVAT_DOMAINS];
