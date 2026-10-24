// 本地背景图上传：FileReader → canvas 压缩 → dataURL
// 目标：单张 ≤ 300KB（localStorage 友好，避免撑爆 5MB 配额与纯静态部署体积）

export const MAX_BACKGROUND_BYTES = 300 * 1024;

export type CompressedBackgroundImage = {
	dataUrl: string;
	bytes: number;
	width: number;
	height: number;
	quality: number;
};

const DIMENSION_STEPS = [1920, 1600, 1280, 1024, 820] as const;
const QUALITY_STEPS = [0.82, 0.72, 0.6, 0.5, 0.4] as const;

function estimateDataUrlBytes(dataUrl: string): number {
	const commaIndex = dataUrl.indexOf(",");
	if (commaIndex < 0) return dataUrl.length;
	// base64: 每 4 个字符 3 字节
	return Math.floor(((dataUrl.length - commaIndex - 1) * 3) / 4);
}

function loadImage(file: File): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const objectUrl = URL.createObjectURL(file);
		const image = new Image();
		image.onload = () => {
			URL.revokeObjectURL(objectUrl);
			resolve(image);
		};
		image.onerror = () => {
			URL.revokeObjectURL(objectUrl);
			reject(new Error("IMAGE_DECODE_FAILED"));
		};
		image.src = objectUrl;
	});
}

function encodeCanvas(canvas: HTMLCanvasElement, quality: number): string {
	const webp = canvas.toDataURL("image/webp", quality);
	// Safari < 16 不支持 webp 编码时会回退成 png（体积大），此时用 jpeg 重新编码
	if (webp.startsWith("data:image/webp")) return webp;
	return canvas.toDataURL("image/jpeg", quality);
}

/**
 * 压缩用户选择的背景图。
 * 依次尝试「缩小尺寸 + 降质量」，直到 dataURL 估算体积 ≤ 300KB。
 * 无法压到目标体积时抛出 TOO_LARGE，由调用方提示用户换图。
 */
export async function compressBackgroundImage(
	file: File,
): Promise<CompressedBackgroundImage> {
	if (!file.type.startsWith("image/")) {
		throw new Error("UNSUPPORTED_TYPE");
	}

	const image = await loadImage(file);
	const sourceWidth = image.naturalWidth || image.width;
	const sourceHeight = image.naturalHeight || image.height;
	if (!sourceWidth || !sourceHeight) {
		throw new Error("IMAGE_DECODE_FAILED");
	}

	const canvas = document.createElement("canvas");
	const context = canvas.getContext("2d");
	if (!context) throw new Error("CANVAS_UNAVAILABLE");
	context.imageSmoothingEnabled = true;
	context.imageSmoothingQuality = "high";

	let last: CompressedBackgroundImage | null = null;

	for (const maxDimension of DIMENSION_STEPS) {
		const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
		const width = Math.max(1, Math.round(sourceWidth * scale));
		const height = Math.max(1, Math.round(sourceHeight * scale));
		canvas.width = width;
		canvas.height = height;
		context.clearRect(0, 0, width, height);
		context.drawImage(image, 0, 0, width, height);

		for (const quality of QUALITY_STEPS) {
			const dataUrl = encodeCanvas(canvas, quality);
			const bytes = estimateDataUrlBytes(dataUrl);
			last = { dataUrl, bytes, width, height, quality };
			if (bytes <= MAX_BACKGROUND_BYTES) {
				return last;
			}
		}
	}

	if (!last || last.bytes > MAX_BACKGROUND_BYTES) {
		throw new Error("TOO_LARGE");
	}
	return last;
}

export function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
