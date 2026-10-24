import type { BackgroundWallpaperConfig } from "@/types/backgroundWallpaper";

export const backgroundWallpaper: BackgroundWallpaperConfig = {
	// 壁纸模式："banner" 横幅壁纸，"fullscreen" 全屏壁纸，"overlay" 覆盖透明，"none" 纯色背景无壁纸
	// Axo：默认全屏壁纸（classic 文档流），首屏即「青のまどろみ」场景
	mode: "fullscreen",
	// 是否允许用户通过导航栏切换壁纸模式，设为false可提升性能（只渲染当前模式）
	playerEnable: false,
	// 背景图片配置
	src: {
		// 桌面背景图片 - 支持数组，随机选择
		// 本地资源：不依赖外链图床，符合纯静态部署约束
		desktop: ["/images/axo-bg-desktop.webp"],
		// 移动背景图片 - 支持数组，随机选择
		mobile: ["/images/axo-bg-mobile.webp"],
	},
	// 横幅壁纸和全屏壁纸共享配置
	common: {
		// 壁纸遮罩暗度，让横幅文字显示更清晰，0-1之间，值越大越暗
		dimOpacity: 0.06,
		// 多视频播放模式："order" 顺序循环，"random" 随机切换（仅当 playerUrl 为数组时生效）
		playerMode: "random",
		// 主页横幅文字
		homeText: {
			// 是否启用主页横幅文字
			enable: true,
			// 主页横幅主标题
			title: "Axolotl_114's Blog",
			// 主页横幅主标题字体大小
			titleSize: "clamp(2.4rem, 4.4vw, 3.9rem)",
			// 主页横幅副标题
			subtitle: [
				"记录动画、游戏与前端的小站",
				"a quiet room for animation, games and front-end notes.",
				"晨光还没散，慢慢写。",
			],
			// 主页横幅副标题字体大小
			subtitleSize: "1.05rem",
			typewriter: {
				// 是否启用打字机效果
				// 打字机开启 → 循环显示所有副标题
				// 打字机关闭 → 每次刷新随机显示一条副标题
				// Axo：关闭，保持场景安静，避免首页持续动效
				enable: false,
				// 打字速度（毫秒）
				speed: 100,
				// 删除速度（毫秒）
				deleteSpeed: 50,
				// 完全显示后的暂停时间（毫秒）
				pauseTime: 2000,
			},
			// 是否显示标题下方的链接图标
			linksEnable: false,
			// 首页横幅标题下方的链接图标（可选，支持 showName 显示文字）
			// 图标支持 Iconify 格式：fa7-brands:github、fa7-solid:envelope、mdi:rss 等
			links: [
				{
					name: "GitHub",
					icon: "fa7-brands:github",
					url: "https://github.com/CuteLeaf/Firefly",
					showName: true,
				},
				{
					name: "Email",
					icon: "fa7-solid:envelope",
					url: "mailto:xiaye@msn.com",
				},
				{
					name: "Sponsor",
					icon: "material-symbols:favorite",
					url: "https://blog.cuteleaf.cn/sponsor/",
				},
				{
					name: "RSS",
					icon: "fa7-solid:rss",
					url: "/rss/",
				},
			],
		},
		// 壁纸轮播配置，横幅壁纸和全屏壁纸共享，仅在配置多张图片时生效
		carousel: {
			// 是否启用壁纸轮播；关闭时保持每次刷新随机显示一张
			enable: false,
			// 轮播切换间隔（毫秒）
			interval: 5000,
			// 过渡效果: 'fade' 渐变 | 'zoom' 缩放 | 'slide' 滑动 | 'kenburns' 旋转木马
			transitionEffect: "zoom",
		},
		// 水波纹动画效果配置，开启会影响页面性能，增加内存占用，请根据自己的喜好开启
		// Axo：关闭水波纹，改用轻量氛围层（呼吸 / 视差 / 颗粒），避免与液态玻璃抢视觉
		waves: {
			enable: {
				// 桌面端是否启用水波纹动画效果
				desktop: false,
				// 移动端是否启用水波纹动画效果
				mobile: false,
			},
		},
		// 渐变过渡效果配置，当水波纹关闭时自动启用，提供壁纸底部到背景色的平滑过渡
		gradient: {
			enable: {
				// 桌面端是否启用渐变过渡
				desktop: true,
				// 移动端是否启用渐变过渡
				mobile: true,
			},
			// 渐变高度
			height: "10%",
		},
	},
	// Banner模式特有配置
	banner: {
		// 图片位置
		// 支持所有CSS object-position值，如: 'top', 'center', 'bottom', 'left top', 'right bottom', '25% 75%', '10px 20px'..
		// 如果不知道怎么配置百分百之类的配置，推荐直接使用：'center'居中，'top'顶部居中，'bottom' 底部居中，'left'左侧居中，'right'右侧居中
		position: "50% 42%",
		// 文章横幅信息："description" 显示描述，"meta" 显示日期、字数和阅读时长
		postInfo: {
			mode: "description",
		},
		// 导航栏配置
		navbar: {
			// 导航栏透明模式："semi" 半透明，"semifull" 动态透明，"none" 纯色不透明
			transparentMode: "semifull",
			// 毛玻璃模糊度，0 即关闭导航栏的毛玻璃
			// 注意：导航栏子菜单与浮动面板始终保留毛玻璃，模糊度跟随此项但有最小值
			blur: 14,
		},
	},
	// 覆盖透明覆盖模式特有配置
	overlay: {
		// 层级，确保壁纸在背景层
		zIndex: -1,
		// 壁纸透明度
		opacity: 0.82,
		// 背景模糊度
		blur: 6,
		// 卡片透明度，0-1之间，值越小越透明
		cardOpacity: 0.72,
	},
	// 全屏壁纸模式特有配置
	// 壁纸模糊度(blur)、卡片透明度(cardOpacity)、层级(zIndex) 复用上方 overlay 模式的配置；
	// 背景透明度(opacity)不适用（全屏壁纸不透明）；导航栏透明模式由 fullscreen.navbar.transparentMode 控制，脱离 banner 的 navbar 配置
	fullscreen: {
		// 布局模式："classic" 经典文档流全屏壁纸，"hero" 固定全屏首屏壁纸
		layout: "classic",
		// 图片位置
		position: "50% 42%",
		// 全屏壁纸模式的导航栏配置
		navbar: {
			// 导航栏透明模式："semi" 半透明，"semifull" 动态透明（仅首页顶部透明、下滑玻璃化；非首页均跟卡片半透明）
			transparentMode: "semifull",
			// 导航栏毛玻璃模糊度，0 即关闭（玻璃态生效）
			blur: 14,
		},
		// 首页下滑时壁纸模糊渐变开关（从 0 渐变为 overlay.blur 的最大模糊）
		// 关闭后该设备上全屏壁纸保持清晰（首页与非首页都不模糊），设置面板的模糊度滑块也会隐藏
		// Axo：桌面端保留（下滑时背景柔化），移动端关闭以获得更顺滑的滚动
		blurRamp: {
			enable: {
				// 桌面端是否启用模糊渐变
				desktop: true,
				// 移动端是否启用模糊渐变
				mobile: false,
			},
		},
	},
	// Axo 主题外观默认值（设置面板可覆盖并持久化到 localStorage）
	appearance: {
		glass: {
			blur: { light: 18, dark: 20 },
			saturation: { light: 2.05, dark: 1.9 },
			borderAlpha: { light: 0.5, dark: 0.22 },
			radius: { light: 12, dark: 14 },
			chromatic: true,
		},
		background: {
			preset: "desktop",
			blur: 0,
			opacity: 1,
			position: "50% 42%",
		},
	},
};
