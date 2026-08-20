export const TEYVAT_DOMAINS = {
	hoyolab_bbs: 'https://bbs-api-os.hoyolab.com/',
	hoyolab_card: 'https://bbs-api-os.hoyolab.com/game_record/card/wapi/',
	hoyolab_takumi: 'https://api-os-takumi.mihoyo.com/',
	hoyoverse_passport: 'https://sg-public-api.hoyoverse.com/account/',
	genshin_record: 'https://sg-public-api.hoyolab.com/event/game_record/genshin/api/',
	hoyolab_map: 'https://sg-public-api.hoyolab.com/common/map_user/ys_obc/v1/user/',
	hoyolab_map_static: 'https://sg-public-api-static.hoyolab.com/common/map_user/ys_obc/v2/map/label/',
	genshin_diary: 'https://sg-hk4e-api.hoyolab.com/event/ysledgeros/',
} as const;

export type TeyvatDomain = (typeof TEYVAT_DOMAINS)[keyof typeof TEYVAT_DOMAINS];
