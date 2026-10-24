# Axo · axolotl114.github.io

> 一个「青のまどろみ」主题的纯静态个人博客：Astro 构建，发布到 GitHub Pages 用户站点，无 Node 常驻、无数据库、无独立后端。

- **站点**：<https://axolotl114.github.io/>
- **托管**：GitHub Pages 用户站点仓库 `Axolotl114/Axolotl114.github.io`（`gh-pages` 分支，免费、自带 CDN 与 HTTPS）
- **产物**：`dist/`（`output: "static"`），最新构建 **23.31 MB / 309 files / 50 HTML**，预算 ≤ 50MB
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
│   └── utils/blog-theme-utils.ts                   # CSS 变量 ←→ localStorage
├── public/images/axo-bg-desktop.webp              # 67KB（1920w）
├── public/images/axo-bg-mobile.webp               # 34KB（1080w）
├── public/assets/images/avatar-axo.webp           # 头像（壁纸裁切）
├── deploy/nginx-site.conf                         # 宝塔 Nginx 片段（纯 ASCII 无注释，直接粘贴）
├── deploy/nginx.conf                              # 同上的中文注释讲解版
├── deploy/pages-deploy.ps1                        # GitHub Pages 更新脚本（build → _deploy/pages → 推送 gh-pages）
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

**现行方案：GitHub Pages 用户站点（无自定义域名）** —— 站点 **https://axolotl114.github.io/**，发布仓库 [`Axolotl114/Axolotl114.github.io`](https://github.com/Axolotl114/Axolotl114.github.io) 的 `gh-pages` 分支（只放 `dist/` 内容 + `.nojekyll`，共 310 个文件；**不要** `CNAME`）。

1. `pnpm build` → 检查 `pnpm size` 无 WARNING；
2. 把 **`dist/` 里的全部内容**（不是 `dist` 文件夹本身）复制到 `_deploy/pages`；
3. 在 `_deploy/pages` 里补 0 字节 `.nojekyll`（否则 Jekyll 会吞掉 `_astro/`，全站无样式）；**不要再生成 `CNAME`**；
4. `git init -b gh-pages` → 提交 → 用 `$env:GITHUB_TOKEN` 内联 header 推送 `gh-pages`（推荐直接跑 `deploy/pages-deploy.ps1`）；
5. 用户站点仓库天然落在域名根路径，`base: "/"` 无需改动；HTTPS 由 `*.github.io` 标配（`https_enforced=true`），**不需要任何 DNS 配置**。

完整步骤、`.nojekyll` 原理、发布命令与排错见 **[DEPLOY.md](./DEPLOY.md) §0**；宝塔 Nginx 主机（moebun.com）作为**备用方案**保留在 DEPLOY.md §1～§10。

## 静态能力

- **搜索**：Pagefind，构建期生成索引到 `dist/pagefind/`，浏览器端同源加载，无服务端。
- **评论**：Giscus（GitHub Discussions，iframe）。零服务端、零数据库；部署前按 [BACKEND-NOTES.md](./BACKEND-NOTES.md) 填好 `src/config/commentConfig.ts` 的 `repo / repoId / category / categoryId`。
- **Waline / Twikoo / Artalk**：不适用（需要 Node 常驻 + 数据库）。

## 仓库与发布

本仓库基于 `GrushTom/astroGT`（Firefly），当前在分支 **`axo`** 上，上游历史保留。推送到自己的 GitHub：

```powershell
# 把 origin 指向上游（保留可同步），新增自己的源码仓库（与 Pages 发布仓库分开，例如 axo-blog）
git remote rename origin upstream
git remote add origin git@github.com:<你的用户名>/axo-blog.git
git push -u origin axo
```

- 站点发布走 **GitHub Pages 用户站点**：`dist/` 内容 + `.nojekyll` 全量推送到 `Axolotl114/Axolotl114.github.io` 的 `gh-pages` 分支（见 [`DEPLOY.md` §0](./DEPLOY.md) 与 [`deploy/pages-deploy.ps1`](./deploy/pages-deploy.ps1)），站点地址 https://axolotl114.github.io/ 。Vercel / Cloudflare Workers 配置保留但本项目不使用。
- `.github/workflows/deploy.yml` 只做 **手动触发（workflow_dispatch）构建并上传 `dist` artifact**，不参与 Pages 发布。
- 宝塔文件管理器 / SFTP / rclone 手动上传流程（DEPLOY.md §1～§10）作为**备用方案**保留。

## 许可与署名

- 主题基座：Firefly（MIT），基于 Fuwari；详见 [LICENSE](./LICENSE) 与 [README.firefly.md](./README.firefly.md)。
- 壁纸与头像：来自项目自带参考素材（`reference/`），仅用于本站。
- 演示文章：`src/content/posts/` 中带有「示例 / 演示」标签的文章来自模板，作为内容占位，可自行替换或删除。
