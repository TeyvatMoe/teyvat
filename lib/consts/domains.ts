export const TEYVAT_DOMAINS = {
	hoyolabBbs: 'https://bbs-api-os.hoyolab.com/',
	hoyolabCard: 'https://bbs-api-os.hoyolab.com/game_record/card/wapi/',
	hoyolabTakumi: 'https://api-os-takumi.mihoyo.com/',
	hoyoversePassport: 'https://sg-public-api.hoyoverse.com/account/',
	genshinRecord: 'https://sg-public-api.hoyolab.com/event/game_record/genshin/api/',
	hoyolabMap: 'https://sg-public-api.hoyolab.com/common/map_user/ys_obc/v1/user/',
	hoyolabMapStatic: 'https://sg-public-api-static.hoyolab.com/common/map_user/ys_obc/v2/map/label/',
	genshinDiary: 'https://sg-hk4e-api.hoyolab.com/event/ysledgeros/',
	genshinWishes: 'https://public-operation-hk4e-sg.hoyoverse.com/gacha_info/api/',
	genshinTransactions: 'https://hk4e-api-os.hoyoverse.com/common/hk4e_self_help_query/User/',
	genshinCheckIn: 'https://sg-hk4e-api.hoyolab.com/event/sol/',
	genshinRedemption: 'https://public-operation-hk4e.hoyoverse.com/common/apicdkey/api/',
	genshinCalculator: 'https://sg-public-api.hoyolab.com/event/e20200928calculate/',
} as const;

export type TeyvatDomain = (typeof TEYVAT_DOMAINS)[keyof typeof TEYVAT_DOMAINS];
