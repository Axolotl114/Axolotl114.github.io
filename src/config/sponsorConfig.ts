import type { SponsorConfig } from "../types/sponsorConfig";

export const sponsorConfig: SponsorConfig = {
	// 页面标题，如果留空则使用 i18n 中的翻译
	title: "",

	// 页面描述文本，如果留空则使用 i18n 中的翻译
	description: "",

	// 打赏用途说明
	usage: "感谢你的支持，本站为非商业的个人静态博客。",

	// 是否显示打赏者列表
	showSponsorsList: true,

	// 是否显示评论区，需要先在commentConfig.ts启用评论系统
	showComment: true,

	// 是否在文章详情页底部显示打赏按钮
	showButtonInPost: true,

	// 赞助列表下方的留言
	footerMessage: "赞助名单为空时不会显示该列表。",

	// 赞助方式列表
	// 模板演示的收款码 / 模板作者链接已清空；如以后需要收赞赏，自行补充本数组即可
	// （sponsor 页面目前在 siteConfig.pages.sponsor 中关闭，补内容后需同时开启页面）
	methods: [],

	// 额外赞助者；JSON 名单由赞助页面自动加载。
	sponsors: [],
};
