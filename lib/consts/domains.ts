export const TEYVAT_DOMAINS = {
	hoyolab_bbs: 'https://bbs-api-os.hoyolab.com/',
	hoyolab_card: 'https://bbs-api-os.hoyolab.com/game_record/card/wapi/',
	hoyolab_takumi: 'https://api-os-takumi.mihoyo.com/',
	genshin_record: 'https://sg-public-api.hoyolab.com/event/game_record/genshin/api/',
} as const;

export type TeyvatDomain = (typeof TEYVAT_DOMAINS)[keyof typeof TEYVAT_DOMAINS];
