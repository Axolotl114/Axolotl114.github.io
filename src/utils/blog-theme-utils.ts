import type { BlogBackgroundConfig } from "@/types/config";
import { backgroundWallpaper } from "../config";

// Axo 主题运行时可调项（F1 背景 / F2 液态玻璃）
// 沿用 Firefly 现有模式：getStored* 读 localStorage → apply*ToDocument 实时写 CSS 变量，
// 默认值全部来自 src/config/backgroundWallpaper.ts 的 appearance 段。

export type ThemeVariant = "light" | "dark";

// 液态玻璃的可调参数（一套 = 一个主题变体）
export type GlassParams = {
	// backdrop-filter 模糊半径（px）
	blur: number;
	// backdrop-filter 饱和度
	saturation: number;
	// 玻璃边框不透明度（0-1）
	borderAlpha: number;
	// 玻璃圆角（px）
	radius: number;
	// 是否启用边缘色差（移动端 / reduced-motion 会被 CSS 强制关闭）
	chromatic: boolean;
};

// 背景设置 = 配置默认值 + 运行时上传图
export type BlogBackgroundSettings = BlogBackgroundConfig & {
	// 本地上传压缩后的 dataURL（custom 预设下 customUrl 为空时使用）
	uploadDataUrl: string;
};

export const GLASS_STORAGE_KEYS: Record<ThemeVariant, string> = {
	light: "axoGlassLight",
	dark: "axoGlassDark",
};

export const BLOG_BG_STORAGE_KEYS = {
	preset: "axoBgPreset",
	customUrl: "axoBgCustomUrl",
	upload: "axoBgUpload",
	blur: "axoBgBlur",
	opacity: "axoBgOpacity",
} as const;

// 滑块取值范围（面板与写入端共用，避免两边各写一套）
export const GLASS_LIMITS = {
	blur: { min: 0, max: 30, step: 1 },
	saturation: { min: 1, max: 2.2, step: 0.05 },
	borderAlpha: { min: 0, max: 1, step: 0.01 },
	radius: { min: 0, max: 24, step: 1 },
} as const;

export const BLOG_BG_LIMITS = {
	blur: { min: 0, max: 24, step: 1 },
	opacity: { min: 0.2, max: 1, step: 0.01 },
} as const;

export type BlogBgPreset = BlogBackgroundConfig["preset"];

export const BLOG_BG_PRESETS: BlogBgPreset[] = [
	"desktop",
	"mobile",
	"custom",
	"solid",
];

function clampNumber(value: number, min: number, max: number): number {
	if (!Number.isFinite(value)) return min;
	return Math.min(max, Math.max(min, value));
}

function readJson(raw: string | null): Record<string, unknown> | null {
	if (!raw) return null;
	try {
		const parsed: unknown = JSON.parse(raw);
		return parsed && typeof parsed === "object"
			? (parsed as Record<string, unknown>)
			: null;
	} catch {
		return null;
	}
}

function writeJson(key: string, value: unknown): void {
	if (typeof localStorage === "undefined") return;
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch {
		// localStorage 配额已满：静默失败，保留上一次可用设置
	}
}

function toFiniteNumber(value: unknown, fallback: number): number {
	const parsed = typeof value === "number" ? value : Number.parseFloat(String(value));
	return Number.isFinite(parsed) ? parsed : fallback;
}

// ── 液态玻璃 ──────────────────────────────────────────────

export function getDefaultGlassParams(variant: ThemeVariant): GlassParams {
	const glass = backgroundWallpaper.appearance?.glass;
	const chromatic = glass?.chromatic ?? true;
	if (!glass) {
		return {
			blur: 14,
			saturation: 1.5,
			borderAlpha: 0.4,
			radius: 12,
			chromatic,
		};
	}
	return {
		blur: glass.blur[variant],
		saturation: glass.saturation[variant],
		borderAlpha: glass.borderAlpha[variant],
		radius: glass.radius[variant],
		chromatic,
	};
}

export function getStoredGlassParams(variant: ThemeVariant): GlassParams {
	const defaults = getDefaultGlassParams(variant);
	if (typeof localStorage === "undefined") return defaults;
	const stored = readJson(localStorage.getItem(GLASS_STORAGE_KEYS[variant]));
	if (!stored) return defaults;
	return {
		blur: clampNumber(
			toFiniteNumber(stored.blur, defaults.blur),
			GLASS_LIMITS.blur.min,
			GLASS_LIMITS.blur.max,
		),
		saturation: clampNumber(
			toFiniteNumber(stored.saturation, defaults.saturation),
			GLASS_LIMITS.saturation.min,
			GLASS_LIMITS.saturation.max,
		),
		borderAlpha: clampNumber(
			toFiniteNumber(stored.borderAlpha, defaults.borderAlpha),
			GLASS_LIMITS.borderAlpha.min,
			GLASS_LIMITS.borderAlpha.max,
		),
		radius: clampNumber(
			toFiniteNumber(stored.radius, defaults.radius),
			GLASS_LIMITS.radius.min,
			GLASS_LIMITS.radius.max,
		),
		chromatic:
			typeof stored.chromatic === "boolean"
				? stored.chromatic
				: defaults.chromatic,
	};
}

// 把一套玻璃参数写成对应主题的 CSS 变量（--glass-*-light / --glass-*-dark）。
// glass.css 里 --glass-blur 等「当前主题」变量再引用它们，因此亮暗互不覆盖。
export function applyGlassParamsToDocument(): void {
	if (typeof document === "undefined") return;
	const root = document.documentElement;
	for (const variant of ["light", "dark"] as const) {
		const params = getStoredGlassParams(variant);
		root.style.setProperty(`--glass-blur-${variant}`, `${params.blur}px`);
		root.style.setProperty(
			`--glass-saturation-${variant}`,
			String(params.saturation),
		);
		root.style.setProperty(
			`--glass-border-alpha-${variant}`,
			String(params.borderAlpha),
		);
		root.style.setProperty(`--glass-radius-${variant}`, `${params.radius}px`);
		root.style.setProperty(
			`--glass-chromatic-${variant}`,
			params.chromatic ? "1" : "0",
		);
	}
}

export function setGlassParams(
	variant: ThemeVariant,
	params: GlassParams,
): GlassParams {
	const safe: GlassParams = {
		blur: clampNumber(params.blur, GLASS_LIMITS.blur.min, GLASS_LIMITS.blur.max),
		saturation: clampNumber(
			params.saturation,
			GLASS_LIMITS.saturation.min,
			GLASS_LIMITS.saturation.max,
		),
		borderAlpha: clampNumber(
			params.borderAlpha,
			GLASS_LIMITS.borderAlpha.min,
			GLASS_LIMITS.borderAlpha.max,
		),
		radius: clampNumber(
			params.radius,
			GLASS_LIMITS.radius.min,
			GLASS_LIMITS.radius.max,
		),
		chromatic: Boolean(params.chromatic),
	};
	writeJson(GLASS_STORAGE_KEYS[variant], safe);
	applyGlassParamsToDocument();
	return safe;
}

export function resetGlassParams(): void {
	if (typeof localStorage !== "undefined") {
		localStorage.removeItem(GLASS_STORAGE_KEYS.light);
		localStorage.removeItem(GLASS_STORAGE_KEYS.dark);
	}
	applyGlassParamsToDocument();
}

// ── 背景系统 ──────────────────────────────────────────────

function firstImageSrc(value: string | string[] | undefined): string {
	if (Array.isArray(value)) return value[0] ?? "";
	return value ?? "";
}

function getConfiguredDesktopImage(): string {
	const src = backgroundWallpaper.src;
	if (typeof src === "string") return src;
	if (Array.isArray(src)) return src[0] ?? "";
	return firstImageSrc(src.desktop);
}

function getConfiguredMobileImage(): string {
	const src = backgroundWallpaper.src;
	if (typeof src === "string") return src;
	if (Array.isArray(src)) return src[0] ?? "";
	return firstImageSrc(src.mobile);
}

// 只允许 http(s)、站内绝对路径与图片 dataURL，避免任意字符串破坏 CSS url()
export function sanitizeBackgroundUrl(value: string): string {
	const trimmed = value.trim();
	if (!trimmed) return "";
	if (/^data:image\/(png|jpe?g|webp|avif|gif|svg\+xml);base64,[A-Za-z0-9+/=]+$/i.test(trimmed)) {
		return trimmed;
	}
	if (!/^(https?:\/\/|\/)/i.test(trimmed)) return "";
	if (/["'\\\s]/.test(trimmed)) return "";
	return trimmed;
}

export function getDefaultBlogBackground(): BlogBackgroundSettings {
	const configured = backgroundWallpaper.appearance?.background;
	return {
		preset: configured?.preset ?? "desktop",
		customUrl: configured?.customUrl ?? "",
		blur: clampNumber(
			configured?.blur ?? 0,
			BLOG_BG_LIMITS.blur.min,
			BLOG_BG_LIMITS.blur.max,
		),
		opacity: clampNumber(
			configured?.opacity ?? 1,
			BLOG_BG_LIMITS.opacity.min,
			BLOG_BG_LIMITS.opacity.max,
		),
		position: configured?.position ?? "50% 42%",
		uploadDataUrl: "",
	};
}

export function getStoredBlogBackground(): BlogBackgroundSettings {
	const defaults = getDefaultBlogBackground();
	if (typeof localStorage === "undefined") return defaults;

	const storedPreset = localStorage.getItem(BLOG_BG_STORAGE_KEYS.preset);
	const preset: BlogBgPreset =
		storedPreset && BLOG_BG_PRESETS.includes(storedPreset as BlogBgPreset)
			? (storedPreset as BlogBgPreset)
			: defaults.preset;

	const customUrl =
		sanitizeBackgroundUrl(
			localStorage.getItem(BLOG_BG_STORAGE_KEYS.customUrl) ?? "",
		) || defaults.customUrl;
	const uploadDataUrl = sanitizeBackgroundUrl(
		localStorage.getItem(BLOG_BG_STORAGE_KEYS.upload) ?? "",
	);

	return {
		preset,
		customUrl,
		uploadDataUrl,
		blur: clampNumber(
			toFiniteNumber(
				localStorage.getItem(BLOG_BG_STORAGE_KEYS.blur),
				defaults.blur,
			),
			BLOG_BG_LIMITS.blur.min,
			BLOG_BG_LIMITS.blur.max,
		),
		opacity: clampNumber(
			toFiniteNumber(
				localStorage.getItem(BLOG_BG_STORAGE_KEYS.opacity),
				defaults.opacity,
			),
			BLOG_BG_LIMITS.opacity.min,
			BLOG_BG_LIMITS.opacity.max,
		),
		position: defaults.position,
	};
}

// 解析当前预设实际要用的图片地址；纯色预设返回空字符串
export function resolveBlogBackgroundImage(
	settings: BlogBackgroundSettings = getStoredBlogBackground(),
): string {
	switch (settings.preset) {
		case "desktop":
			return getConfiguredDesktopImage();
		case "mobile":
			return getConfiguredMobileImage();
		case "custom":
			// 还没填 URL / 上传时回退到桌面预设，避免点「自定义」后背景突然变空
			return (
				sanitizeBackgroundUrl(settings.customUrl ?? "") ||
				sanitizeBackgroundUrl(settings.uploadDataUrl ?? "") ||
				getConfiguredDesktopImage()
			);
		default:
			return "";
	}
}

export function applyBlogBackgroundToDocument(): void {
	if (typeof document === "undefined") return;
	const root = document.documentElement;
	const settings = getStoredBlogBackground();
	const image = resolveBlogBackgroundImage(settings);

	root.setAttribute("data-blog-bg-preset", settings.preset);
	root.style.setProperty("--blog-bg-blur", `${settings.blur}px`);
	root.style.setProperty("--blog-bg-opacity", String(settings.opacity));
	// --blog-bg-position 由 axo-theme.css 按断点控制（桌面 / 移动不同裁切焦点），
	// 这里不写内联值，避免覆盖移动端焦点。
	if (image) {
		root.style.setProperty("--blog-bg-image", `url("${image}")`);
	} else {
		root.style.setProperty("--blog-bg-image", "none");
	}
}

export function setBlogBackground(
	patch: Partial<BlogBackgroundSettings>,
): BlogBackgroundSettings {
	const current = getStoredBlogBackground();
	const next: BlogBackgroundSettings = {
		...current,
		...patch,
	};
	next.preset = BLOG_BG_PRESETS.includes(next.preset)
		? next.preset
		: current.preset;
	next.customUrl = sanitizeBackgroundUrl(next.customUrl ?? "");
	next.uploadDataUrl = sanitizeBackgroundUrl(next.uploadDataUrl ?? "");
	next.blur = clampNumber(
		next.blur,
		BLOG_BG_LIMITS.blur.min,
		BLOG_BG_LIMITS.blur.max,
	);
	next.opacity = clampNumber(
		next.opacity,
		BLOG_BG_LIMITS.opacity.min,
		BLOG_BG_LIMITS.opacity.max,
	);
	next.position = current.position;

	if (typeof localStorage !== "undefined") {
		try {
			localStorage.setItem(BLOG_BG_STORAGE_KEYS.preset, next.preset);
			localStorage.setItem(BLOG_BG_STORAGE_KEYS.customUrl, next.customUrl);
			localStorage.setItem(BLOG_BG_STORAGE_KEYS.blur, String(next.blur));
			localStorage.setItem(BLOG_BG_STORAGE_KEYS.opacity, String(next.opacity));
			if (next.uploadDataUrl) {
				localStorage.setItem(BLOG_BG_STORAGE_KEYS.upload, next.uploadDataUrl);
			} else {
				localStorage.removeItem(BLOG_BG_STORAGE_KEYS.upload);
			}
		} catch {
			// 配额不足：跳过持久化，变量仍实时生效
		}
	}
	applyBlogBackgroundToDocument();
	return next;
}

export function resetBlogBackground(): void {
	if (typeof localStorage !== "undefined") {
		for (const key of Object.values(BLOG_BG_STORAGE_KEYS)) {
			localStorage.removeItem(key);
		}
	}
	applyBlogBackgroundToDocument();
}

// 页面初始化：把持久化设置写回 CSS 变量（Layout 内联脚本已做首帧应用，这里是兜底）
export function initBlogThemeSettings(): void {
	applyGlassParamsToDocument();
	applyBlogBackgroundToDocument();
}
