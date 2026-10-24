<script lang="ts">
import {
	WALLPAPER_BANNER,
	WALLPAPER_FULLSCREEN,
	WALLPAPER_NONE,
	WALLPAPER_OVERLAY,
	DARK_MODE,
	LIGHT_MODE,
	SYSTEM_MODE,
} from "@constants/constants";
import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";
import {
	BLOG_BG_LIMITS,
	GLASS_LIMITS,
	getDefaultBlogBackground,
	getDefaultGlassParams,
	getStoredBlogBackground,
	getStoredGlassParams,
	initBlogThemeSettings,
	resetBlogBackground,
	resetGlassParams,
	resolveBlogBackgroundImage,
	setBlogBackground,
	setGlassParams,
	type BlogBackgroundSettings,
	type GlassParams,
	type ThemeVariant,
} from "@utils/blog-theme-utils";
import {
	compressBackgroundImage,
	formatBytes,
	type CompressedBackgroundImage,
} from "@utils/image-compress-utils";
import {
	getDefaultBannerCarouselEnabled,
	getDefaultBannerTitleEnabled,
	getDefaultCardBorderEnabled,
	getDefaultCardFollowThemeEnabled,
	getDefaultFullscreenLayout,
	getDefaultGradientEnabled,
	getDefaultHue,
	getDefaultOverlayBlur,
	getDefaultOverlayCardOpacity,
	getDefaultOverlayOpacity,
	getDefaultSakuraEnabled,
	getDefaultWavesEnabled,
	getHue,
	getStoredBannerCarouselEnabled,
	getStoredBannerTitleEnabled,
	getStoredCardBorderEnabled,
	getStoredCardFollowThemeEnabled,
	getStoredFullscreenLayout,
	getStoredGradientEnabled,
	getStoredOverlayBlur,
	getStoredOverlayCardOpacity,
	getStoredOverlayOpacity,
	getStoredSakuraEnabled,
	getStoredTheme,
	getStoredWallpaperMode,
	getStoredWavesEnabled,
	setBannerCarouselEnabled,
	setBannerTitleEnabled,
	setCardBorderEnabled,
	setCardFollowThemeEnabled,
	setFullscreenLayout,
	setGradientEnabled,
	setHue,
	setOverlayBlur,
	setOverlayCardOpacity,
	setOverlayOpacity,
	setSakuraEnabled,
	setTheme,
	setWallpaperMode,
	setWavesEnabled,
} from "@utils/setting-utils";
import { onMount } from "svelte";
import Icon from "@/components/common/Icon.svelte";
import {
	backgroundWallpaper,
	displaySettingsConfig,
	siteConfig,
} from "@/config";
import type {
	FullscreenWallpaperLayout,
	LIGHT_DARK_MODE,
	WALLPAPER_MODE,
} from "@/types/config";

type OverlaySliderItem = {
	key: "opacity" | "blur" | "cardOpacity";
	enabled: boolean;
	label: string;
	displayValue: string;
	ariaLabel: string;
	min: number;
	max: number;
	step: number;
	value: number;
	onValueChange: (value: number) => void;
};

type TabKey = "appearance" | "wallpaper" | "effects";

// ── Axo 新增设置项（背景 / 液态玻璃）的本地文案 ──────────────────────────
// 只新增文案、不改 src/i18n（避免扩大多语言文件的改动面）；未知语言回退英文。
const AXO_LABELS: Record<string, Record<string, string>> = {
	zh_CN: {
		theme: "主题",
		glass: "液态玻璃",
		glassHint: "分别调节亮色与暗色的玻璃材质",
		glassVariantLight: "亮色",
		glassVariantDark: "暗色",
		glassBlur: "模糊强度",
		glassSaturation: "饱和度",
		glassBorder: "边框透明度",
		glassRadius: "圆角",
		glassChromatic: "边缘色差",
		background: "背景",
		bgPresetDesktop: "桌面",
		bgPresetMobile: "移动",
		bgPresetSolid: "纯色",
		bgPresetCustom: "自定义",
		bgCustomUrl: "图片地址",
		bgCustomUrlPlaceholder: "https:// 或 /images/…",
		bgUpload: "上传本地图片",
		bgUploadHint: "压缩后 ≤300KB 存入浏览器；大图不建议",
		bgUploading: "正在压缩…",
		bgTooLarge: "图片压缩后仍超过 300KB，请换一张更小的图",
		bgUnsupported: "仅支持图片文件",
		bgPreviewAlt: "当前背景预览",
		bgBlur: "背景模糊",
		bgOpacity: "背景透明度",
		glassReset: "玻璃恢复默认",
		bgReset: "背景恢复默认",
		solidNote: "纯色预设使用页面底色，可在主题色区域调整色相",
	},
	zh_TW: {
		theme: "主題",
		glass: "液態玻璃",
		glassHint: "分別調節亮色與暗色的玻璃材質",
		glassVariantLight: "亮色",
		glassVariantDark: "暗色",
		glassBlur: "模糊強度",
		glassSaturation: "飽和度",
		glassBorder: "邊框透明度",
		glassRadius: "圓角",
		glassChromatic: "邊緣色差",
		background: "背景",
		bgPresetDesktop: "桌面",
		bgPresetMobile: "行動",
		bgPresetSolid: "純色",
		bgPresetCustom: "自訂",
		bgCustomUrl: "圖片網址",
		bgCustomUrlPlaceholder: "https:// 或 /images/…",
		bgUpload: "上傳本機圖片",
		bgUploadHint: "壓縮後 ≤300KB 存入瀏覽器；大圖不建議",
		bgUploading: "正在壓縮…",
		bgTooLarge: "壓縮後仍超過 300KB，請換一張更小的圖",
		bgUnsupported: "僅支援圖片檔案",
		bgPreviewAlt: "目前背景預覽",
		bgBlur: "背景模糊",
		bgOpacity: "背景透明度",
		glassReset: "玻璃恢復預設",
		bgReset: "背景恢復預設",
		solidNote: "純色預設使用頁面底色，可在主題色區域調整色相",
	},
	en: {
		theme: "Theme",
		glass: "Liquid glass",
		glassHint: "Tune light and dark glass separately",
		glassVariantLight: "Light",
		glassVariantDark: "Dark",
		glassBlur: "Blur",
		glassSaturation: "Saturation",
		glassBorder: "Border opacity",
		glassRadius: "Corner radius",
		glassChromatic: "Edge chromatic",
		background: "Background",
		bgPresetDesktop: "Desktop",
		bgPresetMobile: "Mobile",
		bgPresetSolid: "Solid",
		bgPresetCustom: "Custom",
		bgCustomUrl: "Image URL",
		bgCustomUrlPlaceholder: "https:// or /images/…",
		bgUpload: "Upload local image",
		bgUploadHint: "Compressed to ≤300KB and stored locally; large images not recommended",
		bgUploading: "Compressing…",
		bgTooLarge: "Still over 300KB after compression. Try a smaller image.",
		bgUnsupported: "Only image files are supported",
		bgPreviewAlt: "Current background preview",
		bgBlur: "Background blur",
		bgOpacity: "Background opacity",
		glassReset: "Reset glass",
		bgReset: "Reset background",
		solidNote: "Solid preset uses the page base color; adjust the hue under Theme color",
	},
	ja: {
		theme: "テーマ",
		glass: "リキッドグラス",
		glassHint: "ライトとダークのガラスを個別に調整",
		glassVariantLight: "ライト",
		glassVariantDark: "ダーク",
		glassBlur: "ぼかし",
		glassSaturation: "彩度",
		glassBorder: "枠の不透明度",
		glassRadius: "角丸",
		glassChromatic: "縁の色収差",
		background: "背景",
		bgPresetDesktop: "デスクトップ",
		bgPresetMobile: "モバイル",
		bgPresetSolid: "単色",
		bgPresetCustom: "カスタム",
		bgCustomUrl: "画像 URL",
		bgCustomUrlPlaceholder: "https:// または /images/…",
		bgUpload: "ローカル画像をアップロード",
		bgUploadHint: "圧縮後 ≤300KB でブラウザに保存。大きい画像は非推奨",
		bgUploading: "圧縮中…",
		bgTooLarge: "圧縮後も 300KB を超えています。小さい画像を選んでください",
		bgUnsupported: "画像ファイルのみ対応しています",
		bgPreviewAlt: "現在の背景プレビュー",
		bgBlur: "背景のぼかし",
		bgOpacity: "背景の不透明度",
		glassReset: "ガラスを初期化",
		bgReset: "背景を初期化",
		solidNote: "単色プリセットはページ底色を使用します。色相はテーマ色で調整できます",
	},
	ko: {
		theme: "테마",
		glass: "리퀴드 글래스",
		glassHint: "라이트/다크 유리를 각각 조절",
		glassVariantLight: "라이트",
		glassVariantDark: "다크",
		glassBlur: "블러",
		glassSaturation: "채도",
		glassBorder: "테두리 불투명도",
		glassRadius: "모서리 반경",
		glassChromatic: "가장자리 색수차",
		background: "배경",
		bgPresetDesktop: "데스크톱",
		bgPresetMobile: "모바일",
		bgPresetSolid: "단색",
		bgPresetCustom: "사용자 지정",
		bgCustomUrl: "이미지 URL",
		bgCustomUrlPlaceholder: "https:// 또는 /images/…",
		bgUpload: "로컬 이미지 업로드",
		bgUploadHint: "압축 후 ≤300KB로 브라우저에 저장. 큰 이미지는 권장하지 않음",
		bgUploading: "압축 중…",
		bgTooLarge: "압축 후에도 300KB를 넘습니다. 더 작은 이미지를 사용하세요",
		bgUnsupported: "이미지 파일만 지원합니다",
		bgPreviewAlt: "현재 배경 미리보기",
		bgBlur: "배경 블러",
		bgOpacity: "배경 불투명도",
		glassReset: "유리 초기화",
		bgReset: "배경 초기화",
		solidNote: "단색 프리셋은 페이지 기본색을 사용합니다. 테마 색에서 색상을 조절하세요",
	},
	ru: {
		theme: "Тема",
		glass: "Жидкое стекло",
		glassHint: "Светлое и тёмное стекло настраиваются отдельно",
		glassVariantLight: "Светлая",
		glassVariantDark: "Тёмная",
		glassBlur: "Размытие",
		glassSaturation: "Насыщенность",
		glassBorder: "Прозрачность рамки",
		glassRadius: "Скругление",
		glassChromatic: "Хроматизм края",
		background: "Фон",
		bgPresetDesktop: "Десктоп",
		bgPresetMobile: "Мобильный",
		bgPresetSolid: "Цвет",
		bgPresetCustom: "Свой фон",
		bgCustomUrl: "URL изображения",
		bgCustomUrlPlaceholder: "https:// или /images/…",
		bgUpload: "Загрузить изображение",
		bgUploadHint: "Сжимается до ≤300KB и хранится в браузере; большие изображения не рекомендуются",
		bgUploading: "Сжатие…",
		bgTooLarge: "После сжатия всё ещё больше 300KB. Возьмите изображение меньше.",
		bgUnsupported: "Поддерживаются только изображения",
		bgPreviewAlt: "Предпросмотр фона",
		bgBlur: "Размытие фона",
		bgOpacity: "Прозрачность фона",
		glassReset: "Сбросить стекло",
		bgReset: "Сбросить фон",
		solidNote: "Пресет «Цвет» использует базовый цвет страницы; оттенок меняется в разделе темы",
	},
};

function axoLabel(key: string): string {
	const dict =
		AXO_LABELS[siteConfig.lang] ?? AXO_LABELS.zh_CN ?? AXO_LABELS.en;
	return dict[key] ?? AXO_LABELS.en?.[key] ?? key;
}

let hue = $state(getHue());
const defaultHue = getDefaultHue();
let wallpaperMode: WALLPAPER_MODE = $state(backgroundWallpaper.mode);
const defaultWallpaperMode = backgroundWallpaper.mode;
let fullscreenLayout: FullscreenWallpaperLayout = $state(
	getDefaultFullscreenLayout(),
);
const defaultFullscreenLayout = getDefaultFullscreenLayout();
let currentLayout: "list" | "grid" = $state("list");
const defaultLayout = siteConfig.postListLayout.defaultMode;
const mobileDefaultLayout =
	siteConfig.postListLayout.mobileDefaultMode || defaultLayout;
let mounted = $state(false);
let isSmallScreen = $state(
	typeof window !== "undefined" ? window.innerWidth < 1200 : false,
);
let isMobileWidth = $state(
	typeof window !== "undefined" ? window.innerWidth < 780 : false,
);
let isMobileViewport = $state(
	typeof window !== "undefined" ? window.innerWidth < 1024 : false,
);
let isSwitching = $state(false);
let wavesEnabled = $state(true);
const defaultWavesEnabled = getDefaultWavesEnabled();
let gradientEnabled = $state(true);
const defaultGradientEnabled = getDefaultGradientEnabled();
let bannerTitleEnabled = $state(true);
const defaultBannerTitleEnabled = getDefaultBannerTitleEnabled();
let bannerCarouselEnabled = $state(true);
const defaultBannerCarouselEnabled = getDefaultBannerCarouselEnabled();
let sakuraEnabled = $state(true);
const defaultSakuraEnabled = getDefaultSakuraEnabled();
let overlayOpacity = $state(getDefaultOverlayOpacity());
const defaultOverlayOpacity = getDefaultOverlayOpacity();
let overlayBlur = $state(getDefaultOverlayBlur());
const defaultOverlayBlur = getDefaultOverlayBlur();
let overlayCardOpacity = $state(getDefaultOverlayCardOpacity());
const defaultOverlayCardOpacity = getDefaultOverlayCardOpacity();
let cardBorderEnabled = $state(false);
const defaultCardBorderEnabled = getDefaultCardBorderEnabled();
let cardFollowThemeEnabled = $state(false);
const defaultCardFollowThemeEnabled = getDefaultCardFollowThemeEnabled();

// ── Axo：主题模式（亮 / 暗 / 跟随系统，复用现有 setTheme 机制）──────────
const isThemeSectionEnabled = true;
const isGlassSwitchable = displaySettingsConfig.glassSwitchable;
const isBackgroundSwitchable = displaySettingsConfig.backgroundSwitchable;
let themeMode: LIGHT_DARK_MODE = $state(getStoredTheme());

// ── Axo：液态玻璃（亮 / 暗两套参数，分别存储）──────────────────────────
let glassVariant: ThemeVariant = $state("light");
let glassLight: GlassParams = $state(getStoredGlassParams("light"));
let glassDark: GlassParams = $state(getStoredGlassParams("dark"));
const defaultGlassLight = getDefaultGlassParams("light");
const defaultGlassDark = getDefaultGlassParams("dark");
const activeGlass = $derived(
	glassVariant === "light" ? glassLight : glassDark,
);
const glassIsDefault = $derived(
	glassLight.blur === defaultGlassLight.blur &&
		glassLight.saturation === defaultGlassLight.saturation &&
		glassLight.borderAlpha === defaultGlassLight.borderAlpha &&
		glassLight.radius === defaultGlassLight.radius &&
		glassLight.chromatic === defaultGlassLight.chromatic &&
		glassDark.blur === defaultGlassDark.blur &&
		glassDark.saturation === defaultGlassDark.saturation &&
		glassDark.borderAlpha === defaultGlassDark.borderAlpha &&
		glassDark.radius === defaultGlassDark.radius &&
		glassDark.chromatic === defaultGlassDark.chromatic,
);

type GlassSliderKey = "blur" | "saturation" | "borderAlpha" | "radius";

type GlassSliderItem = {
	key: GlassSliderKey;
	label: string;
	displayValue: string;
	min: number;
	max: number;
	step: number;
	value: number;
};

function updateActiveGlass(key: GlassSliderKey, value: number): void {
	const next: GlassParams = { ...activeGlass, [key]: value };
	if (glassVariant === "light") glassLight = next;
	else glassDark = next;
}

let glassSliderItems: GlassSliderItem[] = $derived([
	{
		key: "blur",
		label: axoLabel("glassBlur"),
		displayValue: `${Math.round(activeGlass.blur)}px`,
		...GLASS_LIMITS.blur,
		value: activeGlass.blur,
	},
	{
		key: "saturation",
		label: axoLabel("glassSaturation"),
		displayValue: activeGlass.saturation.toFixed(2),
		...GLASS_LIMITS.saturation,
		value: activeGlass.saturation,
	},
	{
		key: "borderAlpha",
		label: axoLabel("glassBorder"),
		displayValue: `${Math.round(activeGlass.borderAlpha * 100)}%`,
		...GLASS_LIMITS.borderAlpha,
		value: activeGlass.borderAlpha,
	},
	{
		key: "radius",
		label: axoLabel("glassRadius"),
		displayValue: `${Math.round(activeGlass.radius)}px`,
		...GLASS_LIMITS.radius,
		value: activeGlass.radius,
	},
]);

function switchGlassVariant(variant: ThemeVariant): void {
	glassVariant = variant;
	requestAnimationFrame(refreshAllRangeProgress);
}

function toggleGlassChromatic(): void {
	const next: GlassParams = {
		...activeGlass,
		chromatic: !activeGlass.chromatic,
	};
	if (glassVariant === "light") glassLight = next;
	else glassDark = next;
}

function resetGlassSettings(): void {
	glassLight = { ...defaultGlassLight };
	glassDark = { ...defaultGlassDark };
	resetGlassParams();
	requestAnimationFrame(refreshAllRangeProgress);
}

// ── Axo：背景（预设 / 自定义 URL / 上传 / 模糊 / 透明度）───────────────
let blogBg: BlogBackgroundSettings = $state(getStoredBlogBackground());
const defaultBlogBg = getDefaultBlogBackground();
let bgCustomUrlDraft: string = $state(blogBg.customUrl ?? "");
let bgUploadBusy = $state(false);
let bgMessage = $state("");
const bgResolvedImage = $derived(resolveBlogBackgroundImage(blogBg));
const bgIsDefault = $derived(
	blogBg.preset === defaultBlogBg.preset &&
		(blogBg.customUrl ?? "") === (defaultBlogBg.customUrl ?? "") &&
		!blogBg.uploadDataUrl &&
		blogBg.blur === defaultBlogBg.blur &&
		blogBg.opacity === defaultBlogBg.opacity,
);

type BlogBgPreset = BlogBackgroundSettings["preset"];

function chooseBgPreset(preset: BlogBgPreset): void {
	if (preset === "custom" && !bgCustomUrlDraft && !blogBg.uploadDataUrl) {
		bgCustomUrlDraft = blogBg.customUrl ?? "";
	}
	bgMessage = "";
	blogBg = { ...blogBg, preset };
	applyBlogBackgroundSettings();
}

function applyBlogBackgroundSettings(): void {
	setBlogBackground({
		preset: blogBg.preset,
		customUrl: blogBg.customUrl,
		uploadDataUrl: blogBg.uploadDataUrl,
		blur: blogBg.blur,
		opacity: blogBg.opacity,
	});
}

function commitBgCustomUrl(): void {
	const value = bgCustomUrlDraft.trim();
	if (!value) {
		// 清空地址时保留当前预设（upload 图或纯色仍可承载背景）
		blogBg = { ...blogBg, customUrl: "" };
		applyBlogBackgroundSettings();
		bgMessage = "";
		return;
	}
	blogBg = {
		...blogBg,
		customUrl: value,
		preset: "custom",
	};
	applyBlogBackgroundSettings();
	bgMessage = "";
}

async function handleBgUpload(event: Event): Promise<void> {
	const input = event.currentTarget as HTMLInputElement | null;
	const file = input?.files?.[0];
	if (!file) return;
	bgMessage = "";
	bgUploadBusy = true;
	try {
		const compressed: CompressedBackgroundImage =
			await compressBackgroundImage(file);
		blogBg = {
			...blogBg,
			preset: "custom",
			uploadDataUrl: compressed.dataUrl,
			customUrl: "",
		};
		bgCustomUrlDraft = "";
		applyBlogBackgroundSettings();
		bgMessage = `${formatBytes(compressed.bytes)} · ${compressed.width}×${compressed.height}`;
	} catch (error) {
		const reason = error instanceof Error ? error.message : "";
		bgMessage =
			reason === "TOO_LARGE"
				? axoLabel("bgTooLarge")
				: reason === "UNSUPPORTED_TYPE"
					? axoLabel("bgUnsupported")
					: axoLabel("bgUnsupported");
	} finally {
		bgUploadBusy = false;
		if (input) input.value = "";
	}
}

function updateBgBlur(value: number): void {
	blogBg = { ...blogBg, blur: value };
	applyBlogBackgroundSettings();
}

function updateBgOpacity(value: number): void {
	blogBg = { ...blogBg, opacity: value };
	applyBlogBackgroundSettings();
}

type BgSliderItem = {
	id: string;
	key: "blur" | "opacity";
	label: string;
	displayValue: string;
	min: number;
	max: number;
	step: number;
	value: number;
};

let bgSliderItems: BgSliderItem[] = $derived([
	{
		id: "axo-bg-blur",
		key: "blur",
		label: axoLabel("bgBlur"),
		displayValue: `${Math.round(blogBg.blur)}px`,
		...BLOG_BG_LIMITS.blur,
		value: blogBg.blur,
	},
	{
		id: "axo-bg-opacity",
		key: "opacity",
		label: axoLabel("bgOpacity"),
		displayValue: `${Math.round(blogBg.opacity * 100)}%`,
		min: 20,
		max: 100,
		step: 1,
		value: Math.round(blogBg.opacity * 100),
	},
]);

function updateBgSlider(key: "blur" | "opacity", value: number): void {
	if (key === "blur") updateBgBlur(value);
	else updateBgOpacity(value / 100);
}

function triggerBgUpload(): void {
	const input = document.getElementById("axo-bg-upload");
	if (input instanceof HTMLInputElement) input.click();
}

function resetBlogBgSettings(): void {
	blogBg = { ...defaultBlogBg, uploadDataUrl: "" };
	bgCustomUrlDraft = "";
	bgMessage = "";
	resetBlogBackground();
	requestAnimationFrame(refreshAllRangeProgress);
}

function switchThemeMode(mode: LIGHT_DARK_MODE): void {
	themeMode = mode;
	setTheme(mode);
	syncGlassVariantWithTheme();
}

function syncGlassVariantWithTheme(): void {
	if (typeof document === "undefined") return;
	glassVariant = document.documentElement.classList.contains("dark")
		? "dark"
		: "light";
}

const isWallpaperSwitchable = displaySettingsConfig.wallpaperModeSwitchable;
const isFullscreenLayoutSwitchable = $derived(
	displaySettingsConfig.fullscreenLayoutSwitchable &&
		wallpaperMode === WALLPAPER_FULLSCREEN,
);
const allowLayoutSwitch = displaySettingsConfig.layoutSwitchable;
let effectiveDefaultLayout = $derived(
	isMobileWidth ? mobileDefaultLayout : defaultLayout,
);
const showThemeColor = displaySettingsConfig.themeColorSwitchable;
const isWavesSwitchable = displaySettingsConfig.wavesSwitchable;
const isGradientSwitchable = displaySettingsConfig.gradientSwitchable;
// 检查是否启用横幅标题配置（功能开关，非用户切换开关）
const isBannerTitleEnabled =
	backgroundWallpaper.common?.homeText?.enable ?? false;
const isBannerTitleSwitchable =
	isBannerTitleEnabled && displaySettingsConfig.bannerTitleSwitchable;
const isBannerCarouselSwitchable =
	displaySettingsConfig.bannerCarouselSwitchable;
const isSakuraSwitchable = displaySettingsConfig.sakuraSwitchable;
const isCardBorderSwitchable = displaySettingsConfig.cardBorderSwitchable;
const isCardFollowThemeSwitchable =
	displaySettingsConfig.cardFollowThemeSwitchable;
// 是否有任何横幅设置可显示（后续添加新设置时在此处添加条件）
const hasBannerSettings =
	isWavesSwitchable ||
	isGradientSwitchable ||
	isBannerTitleSwitchable ||
	isBannerCarouselSwitchable;
const overlaySwitchableConfig = displaySettingsConfig.overlaySwitchable;
const isOverlaySettingsSwitchable =
	typeof overlaySwitchableConfig === "boolean" ? overlaySwitchableConfig : true;
const isOverlayOpacitySwitchable =
	typeof overlaySwitchableConfig === "boolean"
		? overlaySwitchableConfig
		: (overlaySwitchableConfig.opacity ?? false);
const isOverlayBlurSwitchable =
	typeof overlaySwitchableConfig === "boolean"
		? overlaySwitchableConfig
		: (overlaySwitchableConfig.blur ?? false);
const isOverlayCardOpacitySwitchable =
	typeof overlaySwitchableConfig === "boolean"
		? overlaySwitchableConfig
		: (overlaySwitchableConfig.cardOpacity ?? false);
const hasOverlaySettings =
	isOverlaySettingsSwitchable &&
	(isOverlayOpacitySwitchable ||
		isOverlayBlurSwitchable ||
		isOverlayCardOpacitySwitchable);
// 全屏壁纸模式的模糊渐变是否启用（按当前设备读取 fullscreen.blurRamp 配置，未配置默认开启）
const isFullscreenBlurRampEnabled = $derived.by(() => {
	const enable = backgroundWallpaper.fullscreen?.blurRamp?.enable;
	if (typeof enable === "boolean") return enable;
	if (!enable) return true;
	return isMobileViewport ? enable.mobile : enable.desktop;
});
let overlaySettingsIsDefault = $derived(
	(!isOverlayOpacitySwitchable || overlayOpacity === defaultOverlayOpacity) &&
		(!isOverlayBlurSwitchable || overlayBlur === defaultOverlayBlur) &&
		(!isOverlayCardOpacitySwitchable ||
			overlayCardOpacity === defaultOverlayCardOpacity),
);
// 横幅设置是否全部为默认值（用于控制恢复默认按钮的显隐）
let bannerSettingsIsDefault = $derived(
	(!isBannerTitleSwitchable ||
		bannerTitleEnabled === defaultBannerTitleEnabled) &&
		(!isWavesSwitchable || wavesEnabled === defaultWavesEnabled) &&
		(!isGradientSwitchable || gradientEnabled === defaultGradientEnabled) &&
		(!isBannerCarouselSwitchable ||
			bannerCarouselEnabled === defaultBannerCarouselEnabled),
);
let cardSettingsIsDefault = $derived(
	(!isCardBorderSwitchable || cardBorderEnabled === defaultCardBorderEnabled) &&
		(!isCardFollowThemeSwitchable ||
			cardFollowThemeEnabled === defaultCardFollowThemeEnabled),
);

const hasAnyContent = $derived(
	showThemeColor ||
		isWallpaperSwitchable ||
		isFullscreenLayoutSwitchable ||
		allowLayoutSwitch ||
		hasBannerSettings ||
		hasOverlaySettings ||
		isGlassSwitchable ||
		isBackgroundSwitchable ||
		isSakuraSwitchable,
);

// --- Tab visibility ---
const hasAppearanceTab = $derived(
	showThemeColor ||
		allowLayoutSwitch ||
		isCardBorderSwitchable ||
		isCardFollowThemeSwitchable ||
		isGlassSwitchable ||
		isThemeSectionEnabled,
);
const hasWallpaperTab = $derived(
	isWallpaperSwitchable ||
		isFullscreenLayoutSwitchable ||
		isBackgroundSwitchable ||
		((wallpaperMode === WALLPAPER_OVERLAY ||
			wallpaperMode === WALLPAPER_FULLSCREEN) &&
			hasOverlaySettings) ||
		((wallpaperMode === WALLPAPER_BANNER ||
			wallpaperMode === WALLPAPER_FULLSCREEN) &&
			hasBannerSettings),
);
const hasEffectsTab = $derived(isSakuraSwitchable);

let visibleTabs = $derived.by(() => {
	const tabs: { key: TabKey; icon: string; label: string }[] = [];
	if (hasAppearanceTab)
		tabs.push({
			key: "appearance",
			icon: "material-symbols:palette",
			label: i18n(I18nKey.settingsTabAppearance),
		});
	if (hasWallpaperTab)
		tabs.push({
			key: "wallpaper",
			icon: "material-symbols:wallpaper",
			label: i18n(I18nKey.settingsTabWallpaper),
		});
	if (hasEffectsTab)
		tabs.push({
			key: "effects",
			icon: "mdi:flower-poppy",
			label: i18n(I18nKey.settingsTabEffects),
		});
	return tabs;
});

let showTabBar = $derived(visibleTabs.length > 1);
let activeTab = $state<TabKey>("appearance");

// Auto-switch active tab if it becomes invisible
$effect(() => {
	if (!visibleTabs.find((t) => t.key === activeTab) && visibleTabs.length > 0) {
		activeTab = visibleTabs[0].key;
	}
});

// Auto-switch to wallpaper tab when entering overlay/fullscreen mode
$effect(() => {
	if (
		(wallpaperMode === WALLPAPER_OVERLAY ||
			wallpaperMode === WALLPAPER_FULLSCREEN) &&
		hasOverlaySettings
	) {
		activeTab = "wallpaper";
	}
});

let overlaySliderItems = $derived<OverlaySliderItem[]>([
	{
		key: "opacity",
		// 全屏壁纸模式不需要背景透明度，隐藏该滑块（仍显示模糊与卡片透明度）
		enabled:
			isOverlayOpacitySwitchable && wallpaperMode !== WALLPAPER_FULLSCREEN,
		label: i18n(I18nKey.overlayOpacity),
		displayValue: `${Math.round(overlayOpacity * 100)}%`,
		ariaLabel: i18n(I18nKey.overlayOpacity),
		min: 20,
		max: 100,
		step: 1,
		value: Math.round(overlayOpacity * 100),
		onValueChange: (value) => {
			overlayOpacity = value / 100;
		},
	},
	{
		key: "blur",
		// 全屏壁纸模式关闭模糊渐变时隐藏模糊滑块（overlay 模式不受影响）
		enabled:
			isOverlayBlurSwitchable &&
			!(wallpaperMode === WALLPAPER_FULLSCREEN && !isFullscreenBlurRampEnabled),
		label: i18n(I18nKey.overlayBlur),
		displayValue: `${overlayBlur.toFixed(1)}px`,
		ariaLabel: i18n(I18nKey.overlayBlur),
		min: 0,
		max: 20,
		step: 0.5,
		value: overlayBlur,
		onValueChange: (value) => {
			overlayBlur = value;
		},
	},
	{
		key: "cardOpacity",
		enabled: isOverlayCardOpacitySwitchable,
		label: i18n(I18nKey.overlayCardOpacity),
		displayValue: `${Math.round(overlayCardOpacity * 100)}%`,
		ariaLabel: i18n(I18nKey.overlayCardOpacity),
		min: 20,
		max: 100,
		step: 1,
		value: Math.round(overlayCardOpacity * 100),
		onValueChange: (value) => {
			overlayCardOpacity = value / 100;
		},
	},
]);
// 当前模式下是否有任何 overlay 滑块实际可见（模糊滑块可能因关闭模糊渐变而隐藏）
let hasVisibleOverlaySlider = $derived(
	overlaySliderItems.some((item) => item.enabled),
);

function resetHue() {
	hue = getDefaultHue();
	requestAnimationFrame(refreshAllRangeProgress);
}

function resetWallpaperMode() {
	wallpaperMode = defaultWallpaperMode;
	setWallpaperMode(defaultWallpaperMode);
}

function resetFullscreenLayout() {
	fullscreenLayout = defaultFullscreenLayout;
	setFullscreenLayout(defaultFullscreenLayout);
}

function switchFullscreenLayout(layout: FullscreenWallpaperLayout) {
	if (fullscreenLayout === layout) return;
	fullscreenLayout = layout;
	setFullscreenLayout(layout);
}

function resetLayout() {
	currentLayout = effectiveDefaultLayout;
	localStorage.removeItem("postListLayout");

	// 触发自定义事件，通知页面布局已改变
	const event = new CustomEvent("layoutChange", {
		detail: { layout: effectiveDefaultLayout },
	});
	window.dispatchEvent(event);
}

function resetWavesEnabled() {
	wavesEnabled = defaultWavesEnabled;
	setWavesEnabled(defaultWavesEnabled);
}

function resetGradientEnabled() {
	gradientEnabled = defaultGradientEnabled;
	setGradientEnabled(defaultGradientEnabled);
}

function resetBannerSettings() {
	if (
		isBannerTitleSwitchable &&
		bannerTitleEnabled !== defaultBannerTitleEnabled
	) {
		bannerTitleEnabled = defaultBannerTitleEnabled;
		setBannerTitleEnabled(defaultBannerTitleEnabled);
	}
	if (isWavesSwitchable && wavesEnabled !== defaultWavesEnabled) {
		wavesEnabled = defaultWavesEnabled;
		setWavesEnabled(defaultWavesEnabled);
	}
	if (isGradientSwitchable && gradientEnabled !== defaultGradientEnabled) {
		gradientEnabled = defaultGradientEnabled;
		setGradientEnabled(defaultGradientEnabled);
	}
	if (
		isBannerCarouselSwitchable &&
		bannerCarouselEnabled !== defaultBannerCarouselEnabled
	) {
		bannerCarouselEnabled = defaultBannerCarouselEnabled;
		setBannerCarouselEnabled(defaultBannerCarouselEnabled);
	}
}

function resetOverlaySettings() {
	if (isOverlayOpacitySwitchable && overlayOpacity !== defaultOverlayOpacity) {
		overlayOpacity = defaultOverlayOpacity;
		setOverlayOpacity(defaultOverlayOpacity);
	}
	if (isOverlayBlurSwitchable && overlayBlur !== defaultOverlayBlur) {
		overlayBlur = defaultOverlayBlur;
		setOverlayBlur(defaultOverlayBlur);
	}
	if (
		isOverlayCardOpacitySwitchable &&
		overlayCardOpacity !== defaultOverlayCardOpacity
	) {
		overlayCardOpacity = defaultOverlayCardOpacity;
		setOverlayCardOpacity(defaultOverlayCardOpacity);
	}

	requestAnimationFrame(refreshAllRangeProgress);
}

function toggleWavesEnabled() {
	wavesEnabled = !wavesEnabled;
	setWavesEnabled(wavesEnabled);
}

function toggleGradientEnabled() {
	gradientEnabled = !gradientEnabled;
	setGradientEnabled(gradientEnabled);
}

function toggleBannerTitleEnabled() {
	bannerTitleEnabled = !bannerTitleEnabled;
	setBannerTitleEnabled(bannerTitleEnabled);
}

function toggleBannerCarouselEnabled() {
	bannerCarouselEnabled = !bannerCarouselEnabled;
	setBannerCarouselEnabled(bannerCarouselEnabled);
}

function toggleSakuraEnabled() {
	sakuraEnabled = !sakuraEnabled;
	setSakuraEnabled(sakuraEnabled);
}

function toggleCardBorderEnabled() {
	cardBorderEnabled = !cardBorderEnabled;
	setCardBorderEnabled(cardBorderEnabled);
}

function toggleCardFollowThemeEnabled() {
	cardFollowThemeEnabled = !cardFollowThemeEnabled;
	setCardFollowThemeEnabled(cardFollowThemeEnabled);
}

function resetCardSettings() {
	if (
		isCardBorderSwitchable &&
		cardBorderEnabled !== defaultCardBorderEnabled
	) {
		cardBorderEnabled = defaultCardBorderEnabled;
		setCardBorderEnabled(defaultCardBorderEnabled);
	}
	if (
		isCardFollowThemeSwitchable &&
		cardFollowThemeEnabled !== defaultCardFollowThemeEnabled
	) {
		cardFollowThemeEnabled = defaultCardFollowThemeEnabled;
		setCardFollowThemeEnabled(defaultCardFollowThemeEnabled);
	}
}

function switchWallpaperMode(newMode: WALLPAPER_MODE) {
	wallpaperMode = newMode;
	setWallpaperMode(newMode);
	window.scrollTo({ top: 0 });

	if (newMode === WALLPAPER_OVERLAY || newMode === WALLPAPER_FULLSCREEN) {
		requestAnimationFrame(refreshAllRangeProgress);
	}
}

function checkScreenSize() {
	isSmallScreen = window.innerWidth < 1200;
	isMobileWidth = window.innerWidth < 780;
	isMobileViewport = window.innerWidth < 1024;
	// 低于380px强制网格模式
	if (window.innerWidth < 380 && currentLayout === "list") {
		currentLayout = "grid";
		const event = new CustomEvent("layoutChange", {
			detail: { layout: "grid" },
		});
		window.dispatchEvent(event);
	}
}

function updateRangeProgress(input: HTMLInputElement) {
	const min = Number(input.min || 0);
	const max = Number(input.max || 100);
	const value = Number(input.value || 0);
	const progress = ((value - min) * 100) / (max - min || 1);
	input.style.setProperty(
		"--range-progress",
		`${Math.min(100, Math.max(0, progress))}%`,
	);
}

function refreshAllRangeProgress() {
	const panel = document.getElementById("display-setting");
	if (!panel) return;

	const rangeInputs = Array.from(
		panel.querySelectorAll('input[type="range"]'),
	) as HTMLInputElement[];

	rangeInputs.forEach((input) => {
		updateRangeProgress(input);
	});
}

function switchLayout() {
	if (!mounted || isSwitching) return;

	isSwitching = true;
	currentLayout = currentLayout === "list" ? "grid" : "list";
	localStorage.setItem("postListLayout", currentLayout);

	// 触发自定义事件，通知页面布局已改变
	const event = new CustomEvent("layoutChange", {
		detail: { layout: currentLayout },
	});
	window.dispatchEvent(event);

	// 动画完成后重置状态
	setTimeout(() => {
		isSwitching = false;
	}, 500);
}

onMount(() => {
	mounted = true;
	checkScreenSize();

	// ── Axo：主题 / 玻璃 / 背景（读取持久化值并写回 CSS 变量）──────────
	themeMode = getStoredTheme();
	glassLight = getStoredGlassParams("light");
	glassDark = getStoredGlassParams("dark");
	blogBg = getStoredBlogBackground();
	bgCustomUrlDraft = blogBg.customUrl ?? "";
	initBlogThemeSettings();
	syncGlassVariantWithTheme();

	const handleThemeChange = () => {
		themeMode = getStoredTheme();
		syncGlassVariantWithTheme();
	};
	window.addEventListener("theme-change", handleThemeChange);

	// 从localStorage读取保存的壁纸模式
	wallpaperMode = getStoredWallpaperMode();

	// 从localStorage读取保存的全屏壁纸布局
	fullscreenLayout = getStoredFullscreenLayout();

	// 从localStorage读取水波纹动画状态
	wavesEnabled = getStoredWavesEnabled();

	// 从localStorage读取渐变过渡状态
	gradientEnabled = getStoredGradientEnabled();

	// 从localStorage读取横幅标题状态
	bannerTitleEnabled = getStoredBannerTitleEnabled();

	// 从localStorage读取横幅轮播状态
	bannerCarouselEnabled = getStoredBannerCarouselEnabled();

	// 从localStorage读取樱花特效状态
	sakuraEnabled = getStoredSakuraEnabled();

	// 从localStorage读取卡片样式状态
	cardBorderEnabled = getStoredCardBorderEnabled();
	cardFollowThemeEnabled = getStoredCardFollowThemeEnabled();

	// 从localStorage读取全屏透明设置状态
	overlayOpacity = getStoredOverlayOpacity();
	overlayBlur = getStoredOverlayBlur();
	overlayCardOpacity = getStoredOverlayCardOpacity();

	// 从localStorage读取用户偏好布局
	const savedLayout = localStorage.getItem("postListLayout");
	if (savedLayout && (savedLayout === "list" || savedLayout === "grid")) {
		currentLayout = savedLayout;
	} else {
		currentLayout =
			window.innerWidth < 780 ? mobileDefaultLayout : defaultLayout;
	}

	// 监听窗口大小变化
	window.addEventListener("resize", checkScreenSize);

	return () => {
		window.removeEventListener("resize", checkScreenSize);
		window.removeEventListener("theme-change", handleThemeChange);
	};
});

// 监听布局变化事件
onMount(() => {
	const handleCustomEvent = (event: Event) => {
		const customEvent = event as CustomEvent<{ layout: "list" | "grid" }>;
		currentLayout = customEvent.detail.layout;
	};

	window.addEventListener("layoutChange", handleCustomEvent);

	return () => {
		window.removeEventListener("layoutChange", handleCustomEvent);
	};
});

onMount(() => {
	const panel = document.getElementById("display-setting");
	if (!panel) return;

	const handleRangeInput = (event: Event) => {
		const target = event.target;
		if (target instanceof HTMLInputElement && target.type === "range") {
			updateRangeProgress(target);
		}
	};

	refreshAllRangeProgress();
	panel.addEventListener("input", handleRangeInput);

	return () => {
		panel.removeEventListener("input", handleRangeInput);
	};
});

onMount(() => {
	const handleWallpaperModeChange = (event: Event) => {
		const customEvent = event as CustomEvent<{ mode: WALLPAPER_MODE }>;
		wallpaperMode = customEvent.detail.mode;
	};

	window.addEventListener("wallpaperModeChange", handleWallpaperModeChange);

	return () => {
		window.removeEventListener(
			"wallpaperModeChange",
			handleWallpaperModeChange,
		);
	};
});

$effect(() => {
	if (hue || hue === 0) {
		setHue(hue);
	}
});

$effect(() => {
	if (wallpaperMode === WALLPAPER_OVERLAY) {
		if (isOverlayOpacitySwitchable) {
			setOverlayOpacity(overlayOpacity);
		}
		if (isOverlayBlurSwitchable) {
			setOverlayBlur(overlayBlur);
		}
		if (isOverlayCardOpacitySwitchable) {
			setOverlayCardOpacity(overlayCardOpacity);
		}
	} else if (wallpaperMode === WALLPAPER_FULLSCREEN) {
		// 全屏壁纸不透明，只应用模糊与卡片透明度
		if (isOverlayBlurSwitchable) {
			setOverlayBlur(overlayBlur);
		}
		if (isOverlayCardOpacitySwitchable) {
			setOverlayCardOpacity(overlayCardOpacity);
		}
	}
});

// Tab 切换后刷新滑块进度（overlay 滑块在 DOM 中才生效）
$effect(() => {
	// eslint-disable-next-line @typescript-eslint/no-unused-expressions
	activeTab;
	requestAnimationFrame(refreshAllRangeProgress);
});

// Axo：玻璃参数实时写入 CSS 变量并持久化（亮 / 暗两套分别存储）
$effect(() => {
	setGlassParams("light", glassLight);
	setGlassParams("dark", glassDark);
});

// Axo：背景设置实时写入 CSS 变量并持久化
$effect(() => {
	setBlogBackground({
		preset: blogBg.preset,
		customUrl: blogBg.customUrl,
		uploadDataUrl: blogBg.uploadDataUrl,
		blur: blogBg.blur,
		opacity: blogBg.opacity,
	});
});
</script>

{#if hasAnyContent}
<div id="display-setting" class="glass-surface float-panel float-panel-closed absolute transition-all w-80 right-4 px-3 pt-0 pb-3 max-h-[80vh] overflow-y-auto custom-scrollbar" data-floating-panel data-floating-panel-trigger="display-settings-switch" inert aria-hidden="true">
	<!-- Tab Bar -->
	{#if showTabBar}
	<div class="flex gap-1 border-b border-black/5 dark:border-white/10 pt-3 pb-1 mb-3">
		{#each visibleTabs as tab (tab.key)}
			<button
				id={`settings-tab-${tab.key}`}
				data-settings-tab={tab.key}
				class="focus-ring-inset flex-1 flex flex-col items-center justify-center gap-1.5 py-2 px-2 text-xs font-medium transition-colors rounded-lg min-w-0
					{activeTab === tab.key
						? 'bg-(--btn-plain-bg-hover) text-(--primary)'
						: 'text-gray-500 dark:text-gray-400 hover:bg-(--btn-plain-bg-hover) hover:text-gray-700 dark:hover:text-gray-300'}"
				onclick={() => activeTab = tab.key}
			>
				<Icon icon={tab.icon} class="text-[1.5rem] shrink-0"></Icon>
				<span class="truncate">{tab.label}</span>
			</button>
		{/each}
	</div>
	{/if}

	<!-- Appearance Tab: Theme + Theme Color + Layout -->
	{#if activeTab === "appearance"}
		<!-- Theme Section（亮色 / 暗色 / 跟随系统，复用 setTheme） -->
		{#if isThemeSectionEnabled}
		<div>
			<div class="section-title">
				{axoLabel("theme")}
			</div>
			<div class="grid grid-cols-3 gap-1.5" role="group" aria-label={axoLabel("theme")}>
				<button
					id="axo-theme-light"
					data-axo-theme="light"
					aria-pressed={themeMode === LIGHT_MODE}
					class="btn-regular rounded-md py-2 px-2 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
					class:opacity-60={themeMode !== LIGHT_MODE}
					class:bg-(--btn-regular-bg-hover)={themeMode === LIGHT_MODE}
					onclick={() => switchThemeMode(LIGHT_MODE)}
				>
					<Icon icon="material-symbols:wb-sunny-outline-rounded" class="text-[1.1rem]"></Icon>
					<span class="text-[11px]">{i18n(I18nKey.lightMode)}</span>
				</button>
				<button
					id="axo-theme-dark"
					data-axo-theme="dark"
					aria-pressed={themeMode === DARK_MODE}
					class="btn-regular rounded-md py-2 px-2 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
					class:opacity-60={themeMode !== DARK_MODE}
					class:bg-(--btn-regular-bg-hover)={themeMode === DARK_MODE}
					onclick={() => switchThemeMode(DARK_MODE)}
				>
					<Icon icon="material-symbols:dark-mode-outline-rounded" class="text-[1.1rem]"></Icon>
					<span class="text-[11px]">{i18n(I18nKey.darkMode)}</span>
				</button>
				<button
					id="axo-theme-system"
					data-axo-theme="system"
					aria-pressed={themeMode === SYSTEM_MODE}
					class="btn-regular rounded-md py-2 px-2 flex flex-col items-center justify-center gap-1 active:scale-95 transition-all"
					class:opacity-60={themeMode !== SYSTEM_MODE}
					class:bg-(--btn-regular-bg-hover)={themeMode === SYSTEM_MODE}
					onclick={() => switchThemeMode(SYSTEM_MODE)}
				>
					<Icon icon="material-symbols:brightness-auto-outline-rounded" class="text-[1.1rem]"></Icon>
					<span class="text-[11px]">{i18n(I18nKey.systemMode)}</span>
				</button>
			</div>
		</div>
		{/if}

		<!-- Theme Color Section -->
		{#if showThemeColor}
		<div class="">
			<div class="section-title">
				{i18n(I18nKey.themeColor)}
				<button aria-label="Reset to Default" class="btn-regular rounded-md active:scale-90"
						class:opacity-0={hue === defaultHue} class:pointer-events-none={hue === defaultHue}
						disabled={hue === defaultHue} aria-hidden={hue === defaultHue ? "true" : undefined} onclick={resetHue}>
					<div class="text-(--btn-content)">
						<Icon icon="fa7-solid:arrow-rotate-left" class="text-[0.75rem]"></Icon>
					</div>
				</button>
				<div id="hueValue" class="transition bg-(--btn-regular-bg) rounded-md flex justify-center
				font-bold items-center text-(--btn-content)">
					{hue}
				</div>
			</div>
			<div class="hue-slider-shell w-full h-6 px-1 bg-[oklch(0.80_0.10_0)] dark:bg-[oklch(0.70_0.10_0)] rounded-md select-none">
				<input aria-label={i18n(I18nKey.themeColor)} type="range" min="0" max="360" bind:value={hue}
					   class="slider" id="colorSlider" step="5" style="width: 100%">
			</div>
		</div>
		{/if}

		<!-- Layout Switch Section -->
		{#if allowLayoutSwitch}
		<div class="">
			<div class="section-title">
				{i18n(I18nKey.postListLayout)}
				<button aria-label="Reset to Default" class="btn-regular rounded-md active:scale-90"
						class:opacity-0={currentLayout === effectiveDefaultLayout} class:pointer-events-none={currentLayout === effectiveDefaultLayout}
						disabled={currentLayout === effectiveDefaultLayout} aria-hidden={currentLayout === effectiveDefaultLayout ? "true" : undefined} onclick={resetLayout}>
					<div class="text-(--btn-content)">
						<Icon icon="fa7-solid:arrow-rotate-left" class="text-[0.75rem]"></Icon>
					</div>
				</button>
			</div>
			<div class="flex gap-2">
				<button
					aria-label={i18n(I18nKey.postListLayoutList)}
					class="flex-1 btn-regular rounded-md py-2 px-3 flex items-center justify-center gap-2 active:scale-95 transition-all relative overflow-hidden"
					class:opacity-60={currentLayout !== 'list'}
					class:bg-(--btn-regular-bg-hover)={currentLayout === 'list'}
					disabled={isSwitching}
					onclick={switchLayout}
					title={i18n(I18nKey.postListLayoutList)}
				>
					<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
						<path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
					</svg>
					<span class="text-xs font-medium">{i18n(I18nKey.postListLayoutList)}</span>
				</button>
				<button
					aria-label={i18n(I18nKey.postListLayoutGrid)}
					class="flex-1 btn-regular rounded-md py-2 px-3 flex items-center justify-center gap-2 active:scale-95 transition-all relative overflow-hidden"
					class:opacity-60={currentLayout !== 'grid'}
					class:bg-(--btn-regular-bg-hover)={currentLayout === 'grid'}
					disabled={isSwitching}
					onclick={switchLayout}
					title={i18n(I18nKey.postListLayoutGrid)}
				>
					<svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
						<path d="M3 3h7v7H3V3zm0 11h7v7H3v-7zm11-11h7v7h-7V3zm0 11h7v7h-7v-7z"/>
					</svg>
					<span class="text-xs font-medium">{i18n(I18nKey.postListLayoutGrid)}</span>
				</button>
			</div>
		</div>
		{/if}

		<!-- Card Settings Section -->
		{#if isCardBorderSwitchable || isCardFollowThemeSwitchable}
		<div>
			<div class="section-title">
				{i18n(I18nKey.cardSettings)}
				<button aria-label="Reset to Default" class="btn-regular rounded-md active:scale-90"
						class:opacity-0={cardSettingsIsDefault} class:pointer-events-none={cardSettingsIsDefault}
						disabled={cardSettingsIsDefault} aria-hidden={cardSettingsIsDefault ? "true" : undefined} onclick={resetCardSettings}>
					<div class="text-(--btn-content)">
						<Icon icon="fa7-solid:arrow-rotate-left" class="text-[0.75rem]"></Icon>
					</div>
				</button>
			</div>
			<div class="space-y-1">
				{#if isCardBorderSwitchable}
				<button
					class="w-full btn-regular rounded-md py-2 px-3 flex items-center gap-3 text-left active:scale-95 transition-all relative overflow-hidden"
					class:bg-(--btn-regular-bg-hover)={cardBorderEnabled}
					onclick={toggleCardBorderEnabled}
				>
					<Icon icon="material-symbols:border-outer-rounded" class="text-[1.25rem] shrink-0"></Icon>
					<span class="text-sm flex-1">{i18n(I18nKey.cardBorder)}</span>
					<div class="w-10 h-5 rounded-full transition-all duration-200 relative"
						 class:bg-(--primary)={cardBorderEnabled}
						 class:bg-(--btn-regular-bg-active)={!cardBorderEnabled}>
						<div class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
							 class:left-0.5={!cardBorderEnabled}
							 class:left-5={cardBorderEnabled}></div>
					</div>
				</button>
				{/if}
				{#if isCardFollowThemeSwitchable}
				<button
					class="w-full btn-regular rounded-md py-2 px-3 flex items-center gap-3 text-left active:scale-95 transition-all relative overflow-hidden"
					class:bg-(--btn-regular-bg-hover)={cardFollowThemeEnabled}
					onclick={toggleCardFollowThemeEnabled}
				>
					<Icon icon="material-symbols:palette" class="text-[1.25rem] shrink-0"></Icon>
					<span class="text-sm flex-1">{i18n(I18nKey.cardFollowTheme)}</span>
					<div class="w-10 h-5 rounded-full transition-all duration-200 relative"
						 class:bg-(--primary)={cardFollowThemeEnabled}
						 class:bg-(--btn-regular-bg-active)={!cardFollowThemeEnabled}>
						<div class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
							 class:left-0.5={!cardFollowThemeEnabled}
							 class:left-5={cardFollowThemeEnabled}></div>
					</div>
				</button>
				{/if}
			</div>
		</div>
		{/if}

		<!-- Axo：液态玻璃（亮 / 暗两套参数，分别存储） -->
		{#if isGlassSwitchable}
		<div>
			<div class="section-title">
				{axoLabel("glass")}
				<button
					id="axo-glass-reset"
					aria-label={axoLabel("glassReset")}
					class="btn-regular rounded-md active:scale-90"
					class:opacity-0={glassIsDefault}
					class:pointer-events-none={glassIsDefault}
					disabled={glassIsDefault}
					aria-hidden={glassIsDefault ? "true" : undefined}
					onclick={resetGlassSettings}
				>
					<div class="text-(--btn-content)">
						<Icon icon="fa7-solid:arrow-rotate-left" class="text-[0.75rem]"></Icon>
					</div>
				</button>
			</div>
			<p class="settings-label mb-2">{axoLabel("glassHint")}</p>
			<div class="flex gap-1 mb-2" role="group" aria-label={axoLabel("glass")}>
				<button
					id="axo-glass-variant-light"
					data-axo-glass-variant="light"
					aria-pressed={glassVariant === "light"}
					class="flex-1 btn-regular rounded-md py-1.5 text-xs active:scale-95 transition-all"
					class:opacity-60={glassVariant !== "light"}
					class:bg-(--btn-regular-bg-hover)={glassVariant === "light"}
					onclick={() => switchGlassVariant("light")}
				>
					{i18n(I18nKey.lightMode)}
				</button>
				<button
					id="axo-glass-variant-dark"
					data-axo-glass-variant="dark"
					aria-pressed={glassVariant === "dark"}
					class="flex-1 btn-regular rounded-md py-1.5 text-xs active:scale-95 transition-all"
					class:opacity-60={glassVariant !== "dark"}
					class:bg-(--btn-regular-bg-hover)={glassVariant === "dark"}
					onclick={() => switchGlassVariant("dark")}
				>
					{i18n(I18nKey.darkMode)}
				</button>
			</div>
			<div class="space-y-2">
				{#each glassSliderItems as item (item.key)}
				<div class="glass-well rounded-md bg-(--btn-regular-bg) p-2">
					<div class="flex items-center justify-between mb-1">
						<label for={`axo-glass-${item.key}`} class="settings-label">{item.label}</label>
						<span class="settings-value">{item.displayValue}</span>
					</div>
					<input
						id={`axo-glass-${item.key}`}
						data-axo-glass-slider={item.key}
						aria-label={item.label}
						type="range"
						min={item.min}
						max={item.max}
						step={item.step}
						value={item.value}
						oninput={(e) => updateActiveGlass(item.key, Number((e.currentTarget as HTMLInputElement).value))}
						class="slider w-full overlay-slider"
					/>
				</div>
				{/each}
				<button
					id="axo-glass-chromatic"
					aria-pressed={activeGlass.chromatic}
					class="w-full btn-regular rounded-md py-2 px-3 flex items-center gap-3 text-left active:scale-95 transition-all"
					class:bg-(--btn-regular-bg-hover)={activeGlass.chromatic}
					onclick={toggleGlassChromatic}
				>
					<Icon icon="material-symbols:rainbow-rounded" class="text-[1.15rem] shrink-0"></Icon>
					<span class="text-sm flex-1">{axoLabel("glassChromatic")}</span>
					<div class="w-10 h-5 rounded-full transition-all duration-200 relative"
						 class:bg-(--primary)={activeGlass.chromatic}
						 class:bg-(--btn-regular-bg-active)={!activeGlass.chromatic}>
						<div class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
							 class:left-0.5={!activeGlass.chromatic}
							 class:left-5={activeGlass.chromatic}></div>
					</div>
				</button>
			</div>
		</div>
		{/if}
	{/if}
	{#if activeTab === "wallpaper"}
		<!-- Axo：背景（预设 / 自定义 URL / 本地上传 / 模糊 / 透明度） -->
		{#if isBackgroundSwitchable}
		<div>
			<div class="section-title">
				{axoLabel("background")}
				<button
					id="axo-bg-reset"
					aria-label={axoLabel("bgReset")}
					class="btn-regular rounded-md active:scale-90"
					class:opacity-0={bgIsDefault}
					class:pointer-events-none={bgIsDefault}
					disabled={bgIsDefault}
					aria-hidden={bgIsDefault ? "true" : undefined}
					onclick={resetBlogBgSettings}
				>
					<div class="text-(--btn-content)">
						<Icon icon="fa7-solid:arrow-rotate-left" class="text-[0.75rem]"></Icon>
					</div>
				</button>
			</div>
			<div class="grid grid-cols-4 gap-1.5 mb-2" role="group" aria-label={axoLabel("background")}>
				<button
					id="axo-bg-preset-desktop"
					data-axo-bg-preset="desktop"
					aria-pressed={blogBg.preset === "desktop"}
					class="btn-regular rounded-md py-1.5 flex flex-col items-center gap-1 text-[11px] active:scale-95 transition-all"
					class:opacity-60={blogBg.preset !== "desktop"}
					class:bg-(--btn-regular-bg-hover)={blogBg.preset === "desktop"}
					onclick={() => chooseBgPreset("desktop")}
				>
					<Icon icon="material-symbols:desktop-windows-outline" class="text-[1.05rem]"></Icon>
					<span class="truncate max-w-full">{axoLabel("bgPresetDesktop")}</span>
				</button>
				<button
					id="axo-bg-preset-mobile"
					data-axo-bg-preset="mobile"
					aria-pressed={blogBg.preset === "mobile"}
					class="btn-regular rounded-md py-1.5 flex flex-col items-center gap-1 text-[11px] active:scale-95 transition-all"
					class:opacity-60={blogBg.preset !== "mobile"}
					class:bg-(--btn-regular-bg-hover)={blogBg.preset === "mobile"}
					onclick={() => chooseBgPreset("mobile")}
				>
					<Icon icon="material-symbols:smartphone-outline" class="text-[1.05rem]"></Icon>
					<span class="truncate max-w-full">{axoLabel("bgPresetMobile")}</span>
				</button>
				<button
					id="axo-bg-preset-solid"
					data-axo-bg-preset="solid"
					aria-pressed={blogBg.preset === "solid"}
					class="btn-regular rounded-md py-1.5 flex flex-col items-center gap-1 text-[11px] active:scale-95 transition-all"
					class:opacity-60={blogBg.preset !== "solid"}
					class:bg-(--btn-regular-bg-hover)={blogBg.preset === "solid"}
					onclick={() => chooseBgPreset("solid")}
				>
					<Icon icon="material-symbols:format-color-fill-rounded" class="text-[1.05rem]"></Icon>
					<span class="truncate max-w-full">{axoLabel("bgPresetSolid")}</span>
				</button>
				<button
					id="axo-bg-preset-custom"
					data-axo-bg-preset="custom"
					aria-pressed={blogBg.preset === "custom"}
					class="btn-regular rounded-md py-1.5 flex flex-col items-center gap-1 text-[11px] active:scale-95 transition-all"
					class:opacity-60={blogBg.preset !== "custom"}
					class:bg-(--btn-regular-bg-hover)={blogBg.preset === "custom"}
					onclick={() => chooseBgPreset("custom")}
				>
					<Icon icon="material-symbols:add-photo-alternate-outline" class="text-[1.05rem]"></Icon>
					<span class="truncate max-w-full">{axoLabel("bgPresetCustom")}</span>
				</button>
			</div>

			{#if bgResolvedImage}
			<div class="flex items-center gap-2 mb-2">
				<img
					id="axo-bg-preview"
					src={bgResolvedImage}
					alt={axoLabel("bgPreviewAlt")}
					class="glass-preview w-20 h-12 shrink-0"
					loading="lazy"
					decoding="async"
				/>
				<span class="settings-label truncate">{axoLabel("bgPreviewAlt")}</span>
			</div>
			{/if}

			<div class="glass-well rounded-md bg-(--btn-regular-bg) p-2 mb-2 space-y-1.5">
				<label for="axo-bg-url" class="settings-label block">{axoLabel("bgCustomUrl")}</label>
				<input
					id="axo-bg-url"
					type="url"
					inputmode="url"
					autocomplete="off"
					spellcheck="false"
					class="w-full rounded-md bg-(--card-bg) px-2 py-1.5 text-xs border border-(--line-divider) focus:outline-none focus-visible:ring-2 focus-visible:ring-(--primary)"
					placeholder={axoLabel("bgCustomUrlPlaceholder")}
					value={bgCustomUrlDraft}
					oninput={(e) => (bgCustomUrlDraft = (e.currentTarget as HTMLInputElement).value)}
					onchange={commitBgCustomUrl}
					onblur={commitBgCustomUrl}
				/>
				<div class="flex items-center gap-2">
					<button
						id="axo-bg-upload-btn"
						type="button"
						class="btn-regular rounded-md py-1.5 px-2.5 text-xs flex items-center gap-1.5 active:scale-95"
						disabled={bgUploadBusy}
						aria-label={axoLabel("bgUpload")}
						onclick={triggerBgUpload}
					>
						<Icon icon="material-symbols:upload-rounded" class="text-[1rem]"></Icon>
						<span>{bgUploadBusy ? axoLabel("bgUploading") : axoLabel("bgUpload")}</span>
					</button>
					<input
						id="axo-bg-upload"
						type="file"
						accept="image/*"
						class="glass-file-input"
						aria-label={axoLabel("bgUpload")}
						onchange={handleBgUpload}
					/>
				</div>
				<p class="settings-label" role="status" aria-live="polite">
					{bgMessage || axoLabel("bgUploadHint")}
				</p>
			</div>
			{#if blogBg.preset === "solid"}
			<p class="settings-label mb-2">{axoLabel("solidNote")}</p>
			{/if}

			<div class="space-y-2">
				{#each bgSliderItems as item (item.id)}
				<div class="glass-well rounded-md bg-(--btn-regular-bg) p-2">
					<div class="flex items-center justify-between mb-1">
						<label for={item.id} class="settings-label">{item.label}</label>
						<span class="settings-value">{item.displayValue}</span>
					</div>
					<input
						id={item.id}
						data-axo-bg-slider={item.key}
						aria-label={item.label}
						type="range"
						min={item.min}
						max={item.max}
						step={item.step}
						value={item.value}
						oninput={(e) => updateBgSlider(item.key, Number((e.currentTarget as HTMLInputElement).value))}
						class="slider w-full overlay-slider"
					/>
				</div>
				{/each}
			</div>
		</div>
		{/if}

		<!-- Wallpaper Mode Section -->
		{#if isWallpaperSwitchable}
		<div>
			<div class="section-title">
				{i18n(I18nKey.wallpaperMode)}
				<button aria-label="Reset to Default" class="btn-regular rounded-md active:scale-90"
						class:opacity-0={wallpaperMode === defaultWallpaperMode} class:pointer-events-none={wallpaperMode === defaultWallpaperMode}
						disabled={wallpaperMode === defaultWallpaperMode} aria-hidden={wallpaperMode === defaultWallpaperMode ? "true" : undefined} onclick={resetWallpaperMode}>
					<div class="text-(--btn-content)">
						<Icon icon="fa7-solid:arrow-rotate-left" class="text-[0.75rem]"></Icon>
					</div>
				</button>
			</div>
			<div class="grid grid-cols-2 gap-2">
				<button
					class="btn-regular rounded-md py-2 px-3 flex items-center justify-center gap-2 active:scale-95 transition-all relative overflow-hidden"
					class:opacity-60={wallpaperMode !== WALLPAPER_BANNER}
					class:bg-(--btn-regular-bg-hover)={wallpaperMode === WALLPAPER_BANNER}
					onclick={() => switchWallpaperMode(WALLPAPER_BANNER)}
				>
					<Icon icon="material-symbols:image-outline" class="text-[1.25rem] shrink-0"></Icon>
					<span class="text-xs font-medium">{i18n(I18nKey.wallpaperBannerMode)}</span>
				</button>
				<button
					class="btn-regular rounded-md py-2 px-3 flex items-center justify-center gap-2 active:scale-95 transition-all relative overflow-hidden"
					class:opacity-60={wallpaperMode !== WALLPAPER_FULLSCREEN}
					class:bg-(--btn-regular-bg-hover)={wallpaperMode === WALLPAPER_FULLSCREEN}
					onclick={() => switchWallpaperMode(WALLPAPER_FULLSCREEN)}
				>
					<Icon icon="material-symbols:wallpaper" class="text-[1.25rem] shrink-0"></Icon>
					<span class="text-xs font-medium">{i18n(I18nKey.wallpaperFullscreenMode)}</span>
				</button>
				<button
					class="btn-regular rounded-md py-2 px-3 flex items-center justify-center gap-2 active:scale-95 transition-all relative overflow-hidden"
					class:opacity-60={wallpaperMode !== WALLPAPER_OVERLAY}
					class:bg-(--btn-regular-bg-hover)={wallpaperMode === WALLPAPER_OVERLAY}
					onclick={() => switchWallpaperMode(WALLPAPER_OVERLAY)}
				>
					<Icon icon="material-symbols:full-coverage-outline-rounded" class="text-[1.25rem] shrink-0"></Icon>
					<span class="text-xs font-medium">{i18n(I18nKey.wallpaperOverlayMode)}</span>
				</button>
				<button
					class="btn-regular rounded-md py-2 px-3 flex items-center justify-center gap-2 active:scale-95 transition-all relative overflow-hidden"
					class:opacity-60={wallpaperMode !== WALLPAPER_NONE}
					class:bg-(--btn-regular-bg-hover)={wallpaperMode === WALLPAPER_NONE}
					onclick={() => switchWallpaperMode(WALLPAPER_NONE)}
				>
					<Icon icon="material-symbols:hide-image-outline" class="text-[1.25rem] shrink-0"></Icon>
					<span class="text-xs font-medium">{i18n(I18nKey.wallpaperNoneMode)}</span>
				</button>
			</div>
		</div>
		{/if}

		<!-- Fullscreen Layout Section -->
		{#if isFullscreenLayoutSwitchable}
		<div>
			<div class="section-title">
				{i18n(I18nKey.fullscreenLayout)}
				<button aria-label="Reset to Default" class="btn-regular rounded-md active:scale-90"
						class:opacity-0={fullscreenLayout === defaultFullscreenLayout} class:pointer-events-none={fullscreenLayout === defaultFullscreenLayout}
						disabled={fullscreenLayout === defaultFullscreenLayout} aria-hidden={fullscreenLayout === defaultFullscreenLayout ? "true" : undefined} onclick={resetFullscreenLayout}>
					<div class="text-(--btn-content)">
						<Icon icon="fa7-solid:arrow-rotate-left" class="text-[0.75rem]"></Icon>
					</div>
				</button>
			</div>
			<div class="grid grid-cols-2 gap-2">
				<button
					class="btn-regular rounded-md py-2 px-3 flex items-center justify-center gap-2 active:scale-95 transition-all relative overflow-hidden"
					class:opacity-60={fullscreenLayout !== "classic"}
					class:bg-(--btn-regular-bg-hover)={fullscreenLayout === "classic"}
					onclick={() => switchFullscreenLayout("classic")}
				>
					<Icon icon="material-symbols:view-day-outline" class="text-[1.25rem] shrink-0"></Icon>
					<span class="text-xs font-medium">{i18n(I18nKey.fullscreenClassicLayout)}</span>
				</button>
				<button
					class="btn-regular rounded-md py-2 px-3 flex items-center justify-center gap-2 active:scale-95 transition-all relative overflow-hidden"
					class:opacity-60={fullscreenLayout !== "hero"}
					class:bg-(--btn-regular-bg-hover)={fullscreenLayout === "hero"}
					onclick={() => switchFullscreenLayout("hero")}
				>
					<Icon icon="material-symbols:desktop-landscape-outline-rounded" class="text-[1.25rem] shrink-0"></Icon>
					<span class="text-xs font-medium">{i18n(I18nKey.fullscreenHeroLayout)}</span>
				</button>
			</div>
		</div>
		{/if}

		<!-- Overlay Settings Section（全屏壁纸模式也复用 overlay 的透明/模糊/卡片透明度设置） -->
		{#if (wallpaperMode === WALLPAPER_OVERLAY || (wallpaperMode === WALLPAPER_FULLSCREEN && fullscreenLayout === "hero")) && hasOverlaySettings && hasVisibleOverlaySlider}
		<div class="">
			<div class="section-title">
				{i18n(I18nKey.overlaySettings)}
				<button aria-label="Reset to Default" class="btn-regular rounded-md active:scale-90"
						class:opacity-0={overlaySettingsIsDefault} class:pointer-events-none={overlaySettingsIsDefault}
						disabled={overlaySettingsIsDefault} aria-hidden={overlaySettingsIsDefault ? "true" : undefined} onclick={resetOverlaySettings}>
					<div class="text-(--btn-content)">
						<Icon icon="fa7-solid:arrow-rotate-left" class="text-[0.75rem]"></Icon>
					</div>
				</button>
			</div>
			<div class="space-y-2">
				{#each overlaySliderItems as item (item.key)}
					{#if item.enabled}
						<div class="glass-well rounded-md bg-(--btn-regular-bg) p-2">
							<div class="flex items-center justify-between mb-1">
								<span class="text-xs font-medium text-(--btn-content) opacity-80">{item.label}</span>
								<span class="text-xs text-(--btn-content)">{item.displayValue}</span>
							</div>
							<input
								aria-label={item.ariaLabel}
								type="range"
								min={item.min}
								max={item.max}
								step={item.step}
								value={item.value}
								oninput={(e) => item.onValueChange(Number((e.currentTarget as HTMLInputElement).value))}
								class="slider w-full overlay-slider"
							/>
						</div>
					{/if}
				{/each}
			</div>
		</div>
		{/if}

		<!-- Banner Settings Section -->
		{#if (wallpaperMode === WALLPAPER_BANNER || wallpaperMode === WALLPAPER_FULLSCREEN) && hasBannerSettings}
		<div class="">
			<div class="section-title">
				{i18n(I18nKey.wallpaperSettings)}
				<button aria-label="Reset to Default" class="btn-regular rounded-md active:scale-90"
						class:opacity-0={bannerSettingsIsDefault} class:pointer-events-none={bannerSettingsIsDefault}
						disabled={bannerSettingsIsDefault} aria-hidden={bannerSettingsIsDefault ? "true" : undefined} onclick={resetBannerSettings}>
					<div class="text-(--btn-content)">
						<Icon icon="fa7-solid:arrow-rotate-left" class="text-[0.75rem]"></Icon>
					</div>
				</button>
			</div>
			<div class="space-y-1">
				<!-- Banner Title Switch -->
				{#if isBannerTitleSwitchable}
				<button
					class="w-full btn-regular rounded-md py-2 px-3 flex items-center gap-3 text-left active:scale-95 transition-all relative overflow-hidden"
					class:bg-(--btn-regular-bg-hover)={bannerTitleEnabled}
					onclick={toggleBannerTitleEnabled}
				>
					<Icon icon="material-symbols:titlecase-rounded" class="text-[1.25rem] shrink-0"></Icon>
					<span class="text-sm flex-1">{i18n(I18nKey.wallpaperTitle)}</span>
					<div class="w-10 h-5 rounded-full transition-all duration-200 relative"
						 class:bg-(--primary)={bannerTitleEnabled}
						 class:bg-(--btn-regular-bg-active)={!bannerTitleEnabled}>
						<div class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
							 class:left-0.5={!bannerTitleEnabled}
							 class:left-5={bannerTitleEnabled}></div>
					</div>
				</button>
				{/if}
				<!-- Banner Carousel Switch -->
				{#if isBannerCarouselSwitchable}
				<button
					class="w-full btn-regular rounded-md py-2 px-3 flex items-center gap-3 text-left active:scale-95 transition-all relative overflow-hidden"
					class:bg-(--btn-regular-bg-hover)={bannerCarouselEnabled}
					onclick={toggleBannerCarouselEnabled}
				>
					<Icon icon="material-symbols:view-carousel-outline" class="text-[1.25rem] shrink-0"></Icon>
					<span class="text-sm flex-1">{i18n(I18nKey.wallpaperCarousel)}</span>
					<div class="w-10 h-5 rounded-full transition-all duration-200 relative"
						 class:bg-(--primary)={bannerCarouselEnabled}
						 class:bg-(--btn-regular-bg-active)={!bannerCarouselEnabled}>
						<div class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
							 class:left-0.5={!bannerCarouselEnabled}
							 class:left-5={bannerCarouselEnabled}></div>
					</div>
				</button>
				{/if}
				<!-- Waves Animation Switch（横幅模式和 classic 全屏模式） -->
				{#if isWavesSwitchable && (wallpaperMode === WALLPAPER_BANNER || (wallpaperMode === WALLPAPER_FULLSCREEN && fullscreenLayout === "classic"))}
				<button
					class="w-full btn-regular rounded-md py-2 px-3 flex items-center gap-3 text-left active:scale-95 transition-all relative overflow-hidden"
					class:bg-(--btn-regular-bg-hover)={wavesEnabled}
					onclick={toggleWavesEnabled}
				>
					<Icon icon="material-symbols:airwave-rounded" class="text-[1.25rem] shrink-0"></Icon>
					<span class="text-sm flex-1">{i18n(I18nKey.wavesAnimation)}</span>
					<div class="w-10 h-5 rounded-full transition-all duration-200 relative"
						 class:bg-(--primary)={wavesEnabled}
						 class:bg-(--btn-regular-bg-active)={!wavesEnabled}>
						<div class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
							 class:left-0.5={!wavesEnabled}
							 class:left-5={wavesEnabled}></div>
					</div>
				</button>
				{/if}
				<!-- Gradient Transition Switch（横幅模式和 classic 全屏模式） -->
				{#if isGradientSwitchable && (wallpaperMode === WALLPAPER_BANNER || (wallpaperMode === WALLPAPER_FULLSCREEN && fullscreenLayout === "classic"))}
				<button
					class="w-full btn-regular rounded-md py-2 px-3 flex items-center gap-3 text-left active:scale-95 transition-all relative overflow-hidden"
					class:bg-(--btn-regular-bg-hover)={gradientEnabled}
					onclick={toggleGradientEnabled}
				>
					<Icon icon="material-symbols:gradient" class="text-[1.25rem] shrink-0"></Icon>
					<span class="text-sm flex-1">{i18n(I18nKey.gradientTransition)}</span>
					<div class="w-10 h-5 rounded-full transition-all duration-200 relative"
						 class:bg-(--primary)={gradientEnabled}
						 class:bg-(--btn-regular-bg-active)={!gradientEnabled}>
						<div class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
							 class:left-0.5={!gradientEnabled}
							 class:left-5={gradientEnabled}></div>
					</div>
				</button>
				{/if}
			</div>
		</div>
		{/if}
	{/if}

	<!-- Effects Tab: Sakura -->
	{#if activeTab === "effects"}
		{#if isSakuraSwitchable}
		<div class="">
			<div class="section-title">
				{i18n(I18nKey.effectsSettings)}
				<button aria-label="Reset to Default" class="btn-regular rounded-md active:scale-90"
						class:opacity-0={sakuraEnabled === defaultSakuraEnabled} class:pointer-events-none={sakuraEnabled === defaultSakuraEnabled}
						disabled={sakuraEnabled === defaultSakuraEnabled} aria-hidden={sakuraEnabled === defaultSakuraEnabled ? "true" : undefined}
						onclick={() => { sakuraEnabled = defaultSakuraEnabled; setSakuraEnabled(defaultSakuraEnabled); }}>
					<div class="text-(--btn-content)">
						<Icon icon="fa7-solid:arrow-rotate-left" class="text-[0.75rem]"></Icon>
					</div>
				</button>
			</div>
			<button
				class="w-full btn-regular rounded-md py-2 px-3 flex items-center gap-3 text-left active:scale-95 transition-all relative overflow-hidden"
				class:bg-(--btn-regular-bg-hover)={sakuraEnabled}
				onclick={toggleSakuraEnabled}
			>
				<Icon icon="mdi:flower-poppy" class="text-[1.25rem] shrink-0"></Icon>
				<span class="text-sm flex-1">{i18n(I18nKey.sakuraEffect)}</span>
				<div class="w-10 h-5 rounded-full transition-all duration-200 relative"
					 class:bg-(--primary)={sakuraEnabled}
					 class:bg-(--btn-regular-bg-active)={!sakuraEnabled}>
					<div class="absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200"
						 class:left-0.5={!sakuraEnabled}
						 class:left-5={sakuraEnabled}></div>
				</div>
			</button>
		</div>
		{/if}
	{/if}
</div>
{/if}
