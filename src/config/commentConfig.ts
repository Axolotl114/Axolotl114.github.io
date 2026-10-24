import type { CommentConfig } from "../types/commentConfig";

export const commentConfig: CommentConfig = {
	// 评论系统类型: none, twikoo, waline, giscus, disqus, artalk，默认为none，即不启用评论系统
	type: "giscus",

	//twikoo评论系统配置（未启用；仅保留类型占位，避免指向模板作者服务）
	twikoo: {
		envId: "",
		// 设置 Twikoo 评论系统语言
		lang: "zh-CN",
		// 是否启用文章访问量统计功能
		visitorCount: true,
		// Twikoo JS 文件地址，支持 CDN 链接（未启用时留空）
		jsUrl: "",
		// Twikoo 自定义 CSS 文件地址，为空则不加载
		cssUrl: "",
	},

	//waline评论系统配置（未启用；本项目虚拟主机无法运行 Waline，见 BACKEND-NOTES.md）
	waline: {
		// waline 后端服务地址
		serverURL: "",
		// 设置 Waline 评论系统语言
		lang: "zh-CN",
		// 设置 Waline 评论系统表情地址
		emoji: [],
		// 评论登录模式。可选值如下：
		//   'enable'   —— 默认，允许访客匿名评论和用第三方 OAuth 登录评论，兼容性最佳。
		//   'force'    —— 强制必须登录后才能评论，适合严格社区，关闭匿名评论。
		//   'disable'  —— 禁止所有登录和 OAuth，仅允许匿名评论（填写昵称/邮箱），适用于极简留言。
		login: "enable",
		// 是否启用文章访问量统计功能
		visitorCount: true,
	},

	// artalk评论系统配置（未启用）
	artalk: {
		// artalk后端程序 API 地址
		server: "",
		// 设置 Artalk 语言
		locale: "zh-CN",
		// 是否启用文章访问量统计功能
		visitorCount: true,
	},

	//giscus评论系统配置（GitHub Discussions，纯前端 iframe，无需任何服务端/数据库）
	// 仓库：Axolotl114/Axolotl114.github.io（Public，已开启 Discussions，分类 Announcements）
	// 还差用户手动一步：安装 giscus GitHub App 并授权该仓库 https://github.com/apps/giscus
	// （未安装时 iframe 会提示 "giscus is not installed on this repository"）
	// 四个值与 giscus.app 生成的一致，改仓库/分类时同步更新下面 4 行。
	giscus: {
		// Giscus 评论系统仓库（格式：GitHub用户名/仓库名）
		repo: "Axolotl114/Axolotl114.github.io",
		// Giscus 评论系统仓库ID（形如 R_kgDOxxxxxx）
		repoId: "R_kgDOVVaVBw",
		// Giscus 评论系统分类（GitHub Discussions 里的分类名，需与 categoryId 对应）
		category: "Announcements",
		// Giscus 评论系统分类ID（形如 DIC_kwDOxxxxxx）
		categoryId: "DIC_kwDOVVaVB84DJeM_",
		// Giscus 评论系统映射方式：pathname 按路径映射，每篇文章一个独立 discussion，最稳
		mapping: "pathname",
		// Giscus 严格模式（"1" 表示只有标题完全匹配才复用 discussion）
		strict: "0",
		// Giscus 反应功能（"1" = 允许 reaction）
		reactionsEnabled: "1",
		// Giscus 元数据功能（"1" = iframe 向父页面发 metadata 消息）
		emitMetadata: "0",
		// Giscus 输入框位置：top 在评论列表上方，先写后看
		inputPosition: "top",
		// Giscus 语言
		lang: "zh-CN",
		// Giscus 加载方式
		loading: "lazy",
	},

	//disqus评论系统配置
	disqus: {
		// 获取 Disqus 评论系统
		shortname: "firefly",
	},
};
