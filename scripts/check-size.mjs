#!/usr/bin/env node
/**
 * Axo 博客 — dist 体积检查（纯 Node，无第三方依赖）
 * -----------------------------------------------------------------------------
 * 作用：
 *   1. 递归统计 dist/ 总体积与文件数（附 HTML 页面数）
 *   2. 总 > 50MB      -> 大字 WARNING（主机 300MB 空间 / 带宽 30M 的硬风险）
 *   3. 单文件 > 5MB   -> WARNING
 *   4. dist/images、dist/assets 下图片 > 200KB -> WARNING（列前 10 个）
 *   5. 输出体积 Top 10 最大文件
 *   6. 顺带检查部署关键文件（index.html / 404.html / pagefind / _astro）
 *
 * 设计原则：**只告警，不阻断构建**，退出码始终为 0。
 *
 * 用法：
 *   node scripts/check-size.mjs            # 检查 ./dist
 *   node scripts/check-size.mjs dist       # 检查指定目录
 *   pnpm size                              # package.json 里的快捷命令
 *   pnpm build                             # 构建末尾自动执行本脚本
 */

import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------------------
// 阈值（可按项目需要调整）
// ---------------------------------------------------------------------------
const LIMITS = {
	/** 硬告警阈值：dist 总体积超过此值，大字 WARNING */
	totalWarnMB: 50,
	/** 目标阈值：超过此值给出“接近目标”的提醒（清理演示资源后的目标） */
	totalTargetMB: 40,
	/** 单文件告警阈值 */
	singleFileMB: 5,
	/** 图片大小告警阈值（仅检查 dist/images、dist/assets 目录下） */
	imageWarnKB: 200,
	/** 需要检查图片体积的目录（相对 dist 的一级目录） */
	imageDirs: ["images", "assets"],
	/** 视为图片的扩展名 */
	imageExts: [
		".png",
		".jpg",
		".jpeg",
		".webp",
		".avif",
		".gif",
		".bmp",
		".svg",
		".ico",
		".tiff",
	],
	/** 已知的模板演示冗余资源（存在于 dist 说明源目录还没清理）；当前已全部清理，保留空数组便于以后追加 */
	knownRedundantDirs: [],
};

const MB = 1024 * 1024;
const KB = 1024;

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------
function fmtBytes(bytes) {
	if (bytes >= MB) return `${(bytes / MB).toFixed(2)} MB`;
	if (bytes >= KB) return `${(bytes / KB).toFixed(1)} KB`;
	return `${bytes} B`;
}

function fmtMB(bytes) {
	return (bytes / MB).toFixed(2);
}

/** 递归收集文件；跳过符号链接目录，避免环路 */
function walk(dir, out = []) {
	let entries;
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch (error) {
		console.warn(`  [WARN] 无法读取目录 ${dir}: ${error.message}`);
		return out;
	}
	for (const entry of entries) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			walk(full, out);
		} else if (entry.isFile()) {
			try {
				out.push({ path: full, size: fs.statSync(full).size });
			} catch (error) {
				console.warn(`  [WARN] 无法读取文件 ${full}: ${error.message}`);
			}
		}
		// 符号链接（isSymbolicLink）直接跳过，静态站点不需要
	}
	return out;
}

function relPath(distDir, fullPath) {
	return path.relative(distDir, fullPath).split(path.sep).join("/");
}

function line(char = "=", len = 66) {
	return char.repeat(len);
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------
const distDir = path.resolve(process.argv[2] || "dist");

console.log(line("="));
console.log("  Axo 博客 — dist 体积检查（check-size.mjs）");
console.log(line("="));
console.log(`  目录   : ${distDir}`);
console.log(
	`  阈值   : 总体积告警 > ${LIMITS.totalWarnMB}MB（目标 ≤ ${LIMITS.totalTargetMB}MB）` +
		` / 单文件 > ${LIMITS.singleFileMB}MB / 图片 > ${LIMITS.imageWarnKB}KB`,
);

// dist 不存在：告警但不阻断（退出码仍为 0，构建流程继续）
if (!fs.existsSync(distDir) || !fs.statSync(distDir).isDirectory()) {
	console.log("");
	console.log("  [WARNING] 找不到 dist 目录！请先执行构建（pnpm build）。");
	console.log("");
	console.log(line("="));
	process.exitCode = 0;
	process.exit();
}

const files = walk(distDir);
const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
const htmlFiles = files.filter((file) =>
	file.path.toLowerCase().endsWith(".html"),
);
const totalMB = Number(fmtMB(totalBytes));

console.log("");
console.log(line("-"));
console.log(`  总体积 : ${fmtBytes(totalBytes)}  (${totalBytes} bytes)`);
console.log(
	`  文件数 : ${files.length} 个（其中 HTML ${htmlFiles.length} 个）`,
);
console.log(
	`  预算   : 已用 ${((totalMB / LIMITS.totalWarnMB) * 100).toFixed(1)}% of ${LIMITS.totalWarnMB}MB`,
);
console.log(line("-"));

// ---------------------------------------------------------------------------
// 部署关键文件检查（帮助发现“忘了传/构建不完整”）
// ---------------------------------------------------------------------------
console.log("");
console.log("  [部署关键文件]");
const keyFiles = [
	["index.html", "首页"],
	["404.html", "自定义 404"],
	["pagefind/pagefind.js", "站内搜索运行时"],
	["pagefind/pagefind-entry.json", "搜索索引元数据"],
	["_astro", "带哈希的构建资源目录"],
];
let keyMissing = 0;
for (const [rel, desc] of keyFiles) {
	const exists = fs.existsSync(path.join(distDir, rel));
	if (!exists) {
		keyMissing += 1;
		console.log(`    [WARN] 缺少 ${rel}（${desc}）`);
	}
}
if (keyMissing === 0) {
	console.log("    全部存在：index.html / 404.html / pagefind/ / _astro/");
}
console.log("");

// ---------------------------------------------------------------------------
// Top 10 最大文件
// ---------------------------------------------------------------------------
const top10 = [...files].sort((a, b) => b.size - a.size).slice(0, 10);
if (top10.length > 0) {
	console.log("  [体积 Top 10 文件]");
	top10.forEach((file, index) => {
		const size = fmtBytes(file.size).padStart(9);
		console.log(
			`    ${String(index + 1).padStart(2)}. ${size}   ${relPath(distDir, file.path)}`,
		);
	});
	console.log("");
}

// ---------------------------------------------------------------------------
// 告警收集
// ---------------------------------------------------------------------------
const warnings = [];
const notices = [];

// 1) 总体积
if (totalMB > LIMITS.totalWarnMB) {
	warnings.push(
		`dist 总体积 ${fmtMB(totalBytes)} MB，超过 ${LIMITS.totalWarnMB}MB 告警线（主机空间 300MB）`,
	);
} else if (totalMB > LIMITS.totalTargetMB) {
	notices.push(
		`dist 总体积 ${fmtMB(totalBytes)} MB，超过 ${LIMITS.totalTargetMB}MB 目标（仍低于 ${LIMITS.totalWarnMB}MB 告警线）`,
	);
}

// 2) 单文件
const bigFiles = files.filter((file) => file.size > LIMITS.singleFileMB * MB);
for (const file of bigFiles) {
	warnings.push(
		`单文件过大：${relPath(distDir, file.path)} = ${fmtBytes(file.size)}（> ${LIMITS.singleFileMB}MB）`,
	);
}

// 3) 图片（dist/images、dist/assets 下）
const imageWarnBytes = LIMITS.imageWarnKB * KB;
const bigImages = files.filter((file) => {
	const rel = relPath(distDir, file.path);
	const topDir = rel.split("/")[0];
	const ext = path.extname(file.path).toLowerCase();
	return (
		LIMITS.imageDirs.includes(topDir) &&
		LIMITS.imageExts.includes(ext) &&
		file.size > imageWarnBytes
	);
});
const imageDetailLines = [];
if (bigImages.length > 0) {
	bigImages.sort((a, b) => b.size - a.size);
	warnings.push(
		`${bigImages.length} 张图片超过 ${LIMITS.imageWarnKB}KB（dist/images、dist/assets 下），建议压缩为 WebP（见 ASSETS-GUIDE.md）`,
	);
	for (const file of bigImages.slice(0, 10)) {
		imageDetailLines.push(
			`       ${fmtBytes(file.size).padStart(9)}   ${relPath(distDir, file.path)}`,
		);
	}
	if (bigImages.length > 10) {
		imageDetailLines.push(`       ... 另有 ${bigImages.length - 10} 张，略`);
	}
}

// 4) 已知模板演示冗余
for (const redundant of LIMITS.knownRedundantDirs) {
	const full = path.join(distDir, redundant);
	if (fs.existsSync(full)) {
		const redundantFiles = walk(full);
		const size = redundantFiles.reduce((sum, file) => sum + file.size, 0);
		warnings.push(
			`检测到已知冗余目录 dist/${redundant}（${fmtBytes(size)} / ${redundantFiles.length} 个文件）：` +
				"模板演示资源应已从 public/ 清理，若仍存在请检查构建缓存或源目录",
		);
	}
}

// ---------------------------------------------------------------------------
// 告警输出
// ---------------------------------------------------------------------------
console.log(line("-"));
if (warnings.length === 0) {
	console.log("  结论：OK，未发现体积问题。");
	for (const notice of notices) console.log(`  [提示] ${notice}`);
} else {
	console.log("");
	console.log("  ############################################################");
	console.log("  #                                                          #");
	console.log(
		"  #   W A R N I N G  —  dist 体积告警（不阻断构建）           #",
	);
	console.log("  #                                                          #");
	console.log("  ############################################################");
	console.log("");
	warnings.forEach((warning, index) => {
		console.log(`  ${index + 1}. ${warning}`);
	});
	if (imageDetailLines.length > 0) {
		console.log("");
		console.log("     过大的图片（前 10）：");
		for (const detailLine of imageDetailLines) console.log(detailLine);
	}
	for (const notice of notices) console.log(`  [提示] ${notice}`);
	console.log("");
	console.log(
		"  处理建议：见 ASSETS-GUIDE.md（图片压缩 / 清理演示资源 / 拆分大文件）",
	);
	console.log("");
	// 额外醒目提示（满足“控制台 WARNING 大字提示”）
	if (totalMB > LIMITS.totalWarnMB) {
		console.log(
			"  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
		);
		console.log(
			`  !!!  当前 ${fmtMB(totalBytes)} MB > ${LIMITS.totalWarnMB} MB：上传前请先压缩/清理  !!!`,
		);
		console.log(
			"  !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!",
		);
		console.log("");
	}
}
console.log(line("="));

// 告警不阻断构建：退出码始终 0
process.exitCode = 0;
