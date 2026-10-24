# Axolotl_114's Blog · axolotl114.github.io

> 一个「浅蓝晨光 + 液态玻璃」的纯静态个人博客：Astro 构建，发布到 GitHub Pages 用户站点，无 Node 常驻、无数据库、无独立后端。

- **站点**：<https://axolotl114.github.io/>
- **托管**：GitHub Pages 用户站点仓库 `Axolotl114/Axolotl114.github.io`（`gh-pages` 分支，免费、自带 CDN 与 HTTPS）
- **产物**：`dist/`（`output: "static"`），最新构建 **8.90 MB / 219 files / 23 HTML**（内容清空后；预算 ≤ 50MB）
- **仓库结构**：**`main` = 源码**（Astro 工程）／**`gh-pages` = 构建产物**（`dist/` 内容 + `.nojekyll`）
- **写作**：站点自带 `/admin/` 写作后台（GitHub PAT 登录 → 提交 `main` → Actions 自动构建发布）
- **基座**：Firefly 6.16.8（Astro 7 + Svelte 5 + Tailwind CSS v4）

---

## 快速开始

环境：**Node.js ≥ 22.23**（见 `package.json#engines`）、**pnpm 11**（`preinstall` 强制）。

```powershell
pnpm install
pnpm dev        # http://localhost:4321
pnpm build      # 生成 dist/（构建末尾自动跑体积检查）
pnpm size       # 只跑体积检查（scripts/check-size.mjs）
pnpm check      # astro check
```

> Windows 上若 PowerShell 因执行策略拒绝 `npm.ps1` / `npx.ps1`，请改用 `pnpm.cmd` / `npm.cmd`。
> 构建不需要任何外部字体 CDN（`fontConfig.enable = false`，使用系统字体栈）。

## 目录结构（与模板的差异）

```text
.
├── src/
│   ├── styles/
│   │   ├── axo-theme.css        # 背景系统 + 主题皮肤（--blog-bg-*、--axo-*）
│   │   └── glass.css            # 液态玻璃体系（--glass-*，亮暗两套）
│   ├── components/
│   │   ├── common/GlassButton.astro
│   │   ├── common/GlassIconButton.astro
│   │   ├── common/GlassPanel.astro
│   │   └── layout/BackgroundAtmosphere.astro
│   ├── controls/DisplaySettingsIntegrated.svelte   # 设置面板（主题 / 玻璃 / 背景）
│   ├── config/backgroundWallpaper.ts               # 壁纸模式与背景预设
│   ├── config/commentConfig.ts                     # Giscus（部署前替换 4 个占位值）
│   ├── pages/admin.astro                           # /admin/ 私有写作后台（PAT 登录）
│   ├── content/posts|dynamic|projects/             # 内容目录（模板演示内容已清空）
│   └── utils/blog-theme-utils.ts                   # CSS 变量 ←→ localStorage
├── public/images/axo-bg-desktop.webp              # 67KB（1920w）
├── public/images/axo-bg-mobile.webp               # 34KB（1080w）
├── public/assets/images/avatar-axo.webp           # 头像（壁纸裁切）
├── .github/workflows/pages.yml                    # main → pnpm build → 发布 gh-pages
├── deploy/nginx-site.conf                         # 宝塔 Nginx 片段（纯 ASCII 无注释，直接粘贴）
├── deploy/nginx.conf                              # 同上的中文注释讲解版
├── deploy/pages-deploy.ps1                        # 备用手动发布（build → _deploy/pages → 推 gh-pages）
├── deploy/sync-source.ps1                         # 把本地最小源码集推到源码仓库 main
├── scripts/check-size.mjs                         # dist 体积告警
├── .agents/skills/                                # 项目级 Agent Skills
├── DEPLOY.md                                      # 部署指南（先读这个）
├── BACKEND-NOTES.md                               # Pagefind / Giscus / Waline 评估
├── ASSETS-GUIDE.md                                # 图片与体积规范
└── docs/design/FRONTEND-NOTES.md                  # 前端实现记录 + 稳定选择器
```

## 视觉系统

| 层 | 要点 |
| --- | --- |
| 背景 | 全屏壁纸（本地 WebP）+ 可读性遮罩 + 柔光 + 颗粒 + 18s 呼吸 + 桌面端指针视差；`--blog-bg-image / size / position / blur / opacity / overlay` |
| 液态玻璃 | `GlassButton` / `GlassPanel` / `GlassIconButton`；1px 内描边 + 顶部柔光 dot + 边缘色差内阴影（无斜向高光条、无 WebGL）；`--glass-blur / saturation / bg-light / bg-dark / border / radius / chromatic` |
| 设置面板 | 导航栏调色板按钮打开；「外观」= 主题 + 液态玻璃（亮暗分别调）；「壁纸」= 背景预设 / URL / 本地上传（≤300KB）/ 模糊 / 透明度；全部实时写 CSS 变量并持久化到 localStorage |
| 降级 | 移动端：blur ≤10px、关色差、实底、关视差；`prefers-reduced-motion`：所有动效关闭 |

## 部署（TL;DR）

**现行方案：GitHub Pages 用户站点（无自定义域名）** —— 站点 **https://axolotl114.github.io/**，发布仓库 [`Axolotl114/Axolotl114.github.io`](https://github.com/Axolotl114/Axolotl114.github.io)。

- **`main` = 源码**：本仓库（Astro 工程，不含 `dist/`）；日常写作走 `/admin/` 或本地编辑后提交。
- **`gh-pages` = 构建产物**：只放 `dist/` 内容 + `.nojekyll`（**不要** `CNAME`）；Pages Source = `gh-pages` / `/`。
- **自动发布**：push 到 `main`（或手动 `workflow_dispatch`）→ `.github/workflows/pages.yml` 执行 `pnpm install` + `pnpm build` → 用 `peaceiris/actions-gh-pages` 把 `dist/` 发布到 `gh-pages`，约 2～5 分钟上线。
- **备用手动发布**：本地 `pnpm build` → `powershell -ExecutionPolicy Bypass -File deploy\pages-deploy.ps1`（构建 + 补 `.nojekyll` + 推 `gh-pages`，token 从 `$env:GITHUB_TOKEN` 读取）。
- 用户站点仓库天然落在域名根路径，`base: "/"` 无需改动；HTTPS 由 `*.github.io` 标配，**不需要任何 DNS 配置**。

完整步骤、分支约定、`.nojekyll` 原理与排错见 **[DEPLOY.md](./DEPLOY.md) §0**；宝塔 Nginx 主机（moebun.com）作为**备用方案**保留在 DEPLOY.md §1～§10。

## 内容撰写：`/admin/` 写作后台

站内自带一个**私有、纯前端**的写作后台（`src/pages/admin.astro`，`noindex`、不在导航、不参与 Pagefind 检索）：

1. 打开 **<https://axolotl114.github.io/admin/>**，用 **GitHub Personal Access Token** 登录：
   - classic PAT：勾选 `repo`；
   - fine-grained PAT：Repository permissions → `Contents: Read and write`，授权 `Axolotl114/Axolotl114.github.io`；
   - 只有 `Axolotl114` 账号的 token 会被放行；token 只保存在浏览器（勿在共用设备勾选"记住"）。
2. 在后台新建/编辑文章（标题、slug、日期、分类、标签、正文 Markdown），保存即通过 GitHub API 提交到 `main` 的 `src/content/posts/<slug>.md`。
3. 提交后 GitHub Actions（`pages.yml`）自动构建并发布，约 2～5 分钟可见。

> 本地写作等价流程：在 `src/content/posts/` 新建 `.md` → `pnpm build` 自检 → 提交并 push `main`。
> 文章 frontmatter 字段见 `src/content.config.ts`（`title/published/description/tags/category/draft/pinned/comment` 等）。

## 静态能力

- **搜索**：Pagefind，构建期生成索引到 `dist/pagefind/`，浏览器端同源加载，无服务端。
- **评论**：Giscus（GitHub Discussions，iframe）。零服务端、零数据库；部署前按 [BACKEND-NOTES.md](./BACKEND-NOTES.md) 填好 `src/config/commentConfig.ts` 的 `repo / repoId / category / categoryId`。
- **Waline / Twikoo / Artalk**：不适用（需要 Node 常驻 + 数据库）。

## 仓库与发布

本仓库基于 `GrushTom/astroGT`（Firefly），上游历史保留。**源码分支 = `main`，产物分支 = `gh-pages`**：

| 分支 | 内容 | 写入方 |
| --- | --- | --- |
| `main` | 源码（`src/`、`public/`、`scripts/`、`package.json`、`astro.config.mjs` …，不含 `dist/`） | 本地开发 / `/admin/` 写作后台 / PR |
| `gh-pages` | 站点产物（`dist/` 全部内容 + `.nojekyll`，不含源码） | `.github/workflows/pages.yml` 自动发布，或 `deploy/pages-deploy.ps1` 备用 |

发布流水线：`main` push（或 Actions 手动触发）→ `pages.yml`：`pnpm install` → `pnpm build`（含 Pagefind 索引与体积检查）→ `peaceiris/actions-gh-pages` 发布到 `gh-pages` → GitHub Pages（Source=`gh-pages`）上线 `https://axolotl114.github.io/`。

- 自动发布工作流：`.github/workflows/pages.yml`（已启用；`build.yml`/`biome.yml` 只做 CI 检查）。
- 备用手动发布：`deploy/pages-deploy.ps1`（本地构建后推 `gh-pages`，token 从 `$env:GITHUB_TOKEN` 读取）。
- 内容撰写：站内 `/admin/` 后台（PAT 登录，提交到 `main`，不直接碰 `gh-pages`）。
- 宝塔文件管理器 / SFTP / rclone 手动上传流程（DEPLOY.md §1–§10）作为**备用方案**保留；Vercel / Cloudflare 配置保留但不使用。

## 仓库瘦身记录（2026-10）

- 模板演示内容已全部清空：`src/content/{posts,dynamic,projects}`（文章/动态/项目）、`src/data/friends/*.json`、`src/data/sponsors/*.json`、`src/config/galleryConfig.ts` 演示相册；站点从空内容开始。
- `public/pio/`（Live2D/Spine 看板娘素材）**整目录删除 14.62MB**（配置本就 `enable: false`；`scripts/prune-pio-assets.ts` 无需修改，产物无 `dist/pio/` 时自动 no-op）。
- 未引用素材删除约 0.18MB：`public/assets/images/{avatar.webp,firefly.png}`、`public/assets/images/sponsor/*.png`、`public/assets/images/ad/ad1.webp`。
- 打赏 / 书签导航配置移除模板作者链接与收款码（`sponsorConfig.ts`、`booknavConfig.ts`）；`public/` 由约 17.8MB 降至约 1.69MB。
- 构建产物体积 / 页面数**以最新一次 `pnpm build` 末尾 `pnpm size` 输出为准**（详见 [ASSETS-GUIDE.md](./ASSETS-GUIDE.md)）。

## 许可与署名

- 主题基座：Firefly（MIT），基于 Fuwari；详见 [LICENSE](./LICENSE) 与 [README.firefly.md](./README.firefly.md)。
- 壁纸与头像：来自项目自带参考素材（`reference/`），仅用于本站。
- 内容：`src/content/posts/` 等模板演示内容已于 2026-10 全部清空，站点从空内容重新开始（`/admin/` 或本地撰写）。
