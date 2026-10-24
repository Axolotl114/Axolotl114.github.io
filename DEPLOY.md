# Axo 博客部署指南

> 目标站点：**https://axolotl114.github.io/**（GitHub Pages 用户站点，免费、无自定义域名；原 `axo.dpdns.org` 方案已废弃）
> 当前部署：**GitHub Pages**（仓库 `Axolotl114/Axolotl114.github.io` 的 `gh-pages` 分支，见下方 §0）
> 备用方案：moebun.com 宝塔虚拟主机（Nginx，空间 300MB / 数据库 200MB / 带宽 30M）
> 产物：Astro `output: 'static'` 构建出的 `dist/`，**只上传 `dist/` 的内容**到站点根目录。
>
> 本文所有体积/页面数基线均可复现（见〔附录 C〕）。**2026-10 内容重建后**：模板演示内容已全部清空（`src/content/posts`、`src/content/dynamic`、`src/content/projects` 为空；`friends/sponsors` 示例 JSON、`galleryConfig` 演示相册已清空），站点从「空内容」起步。
> **最新体积/页面数以最后一次 `pnpm build` 末尾 `pnpm size` 的输出为准**（此前 23.31 MB / 309 文件 / 50 HTML / 29 页的基线已因内容清空而失效，仅作历史参考）。

---

## 0. 当前方案：GitHub Pages 用户站点（无自定义域名）

站点通过 **GitHub Pages 用户站点仓库**发布到免费地址 `https://axolotl114.github.io/`：无服务器、免费、自带 CDN 与 HTTPS。`Axolotl114.github.io` 是 GitHub 的「用户站点」仓库，站点直接落在域名**根路径**，所以 Astro 的 `base: "/"` 与 `/_astro/...`、`/pagefind/...`、`/images/...` 绝对路径全部原样可用。发布内容只有网站产物：`dist/` 的全部内容 + `.nojekyll`（**文件数以最新构建为准**，不含源码、文档、依赖）。

| 项目 | 值 |
| --- | --- |
| 站点地址 | <https://axolotl114.github.io/> |
| 发布仓库 | <https://github.com/Axolotl114/Axolotl114.github.io>（public；由旧仓库 `axo-blog` 改名而来） |
| **仓库结构** | **`main` = 源码**（Astro 工程）；**`gh-pages` = 构建产物**（`dist/` 内容 + `.nojekyll`） |
| 发布分支 | `gh-pages`（仓库默认分支；分支根目录 = 站点根目录，不嵌套 `dist/`） |
| Pages 配置 | Source = `gh-pages` / `/`，`build_type: legacy`（Pages 只托管分支，不跑 Actions 部署） |
| 自动构建 | `.github/workflows/pages.yml`：push 到 `main`（或手动 `workflow_dispatch`）→ `pnpm install` + `pnpm build` → 用 `peaceiris/actions-gh-pages` 把 `dist/` 发布到 `gh-pages` |
| 写作后台 | <https://axolotl114.github.io/admin/>（PAT 登录 → 直接提交 `src/content/posts/<slug>.md` 到 `main`，触发 Actions） |
| 自定义域名 | **无**（`axo.dpdns.org` 已移除；不需要任何 DNS 记录） |
| 手动发布（备用） | `deploy/pages-deploy.ps1`（本地 `pnpm build` 后手动推 `gh-pages`） |
| 备用方案 | 宝塔 Nginx 虚拟主机，见本文件 §1～§10（保留备查） |

### 0.1 唯一必需的元文件：`.nojekyll`

| 文件 | 内容 | 作用 |
| --- | --- | --- |
| `.nojekyll` | 空文件（0 字节） | GitHub Pages 默认跑 **Jekyll**，会静默忽略下划线开头的目录 → `_astro/` 全部 404、全站无样式/无 JS。空 `.nojekyll` 关掉 Jekyll 处理 |

> `CNAME` 文件已删除：改用 `axolotl114.github.io` 用户站点后不需要自定义域名（保留 `CNAME` 反而会把站点绑回旧域名并触发 301）。**不要**把 `CNAME` 加回去。
> 用户站点仓库天然位于域名根路径；若改成普通项目仓库（如 `axo-blog`），地址会变成 `https://axolotl114.github.io/axo-blog/`，`base: "/"` 与 `/_astro/` 就会全部 404。

### 0.2 DNS（已废弃，无需任何操作）

改用 `axolotl114.github.io` 后**不需要配置任何 DNS 记录**，也不需要动 `dpdns.org` 面板。`axo.dpdns.org` 已从 Pages 设置中移除（`PUT /pages {"cname": null}`），访问旧域名不再生效；以后若想重新启用自定义域名，再按 CNAME 指向 `axolotl114.github.io` 并等待证书签发即可。

### 0.3 HTTPS

`*.github.io` 是 GitHub Pages 标配 HTTPS（自动签发、自动续期）。用户站点默认 `https_enforced=true`（可用 `GET /repos/Axolotl114/Axolotl114.github.io/pages` 确认），不需要额外申请证书；也可在仓库 **Settings → Pages → Enforce HTTPS** 查看状态。

### 0.4 写作与发布：`main` = 源码，`gh-pages` = 产物

**仓库结构（两分支单向流水线）**：

| 分支 | 内容 | 谁写入 |
| --- | --- | --- |
| **`main`** | 源码：`src/`、`public/`、`scripts/`、`package.json`、`astro.config.mjs` …（不含 `dist/`） | 本地开发 / `/admin/` 写作后台 / 手工 PR |
| **`gh-pages`** | 构建产物：`dist/` 的全部内容 + `.nojekyll`（**不含源码**） | 仅由 `.github/workflows/pages.yml` 自动写入（或备用脚本 `deploy/pages-deploy.ps1` 手动推送） |

**日常写作（推荐）：`/admin/` 写作后台**

打开 <https://axolotl114.github.io/admin/>（`noindex`、不在导航、不参与 Pagefind 检索）：

1. 用 **GitHub Personal Access Token** 登录：
   - classic PAT：勾选 `repo`；
   - fine-grained PAT：Repository permissions → **Contents: Read and write**，授权 `Axolotl114/Axolotl114.github.io`；
   - 只有 `Axolotl114` 账号的 token 会被放行；token 只存在浏览器内存（可选 localStorage，仅限私人设备）。
2. 新建/编辑文章 → 填写标题、slug、日期、分类、标签、正文（Markdown）。
3. 点「提交到 main」→ 文章写入 `main` 分支的 `src/content/posts/<slug>.md`。
4. `.github/workflows/pages.yml` 自动触发：`pnpm install` → `pnpm build` → 把 `dist/` 发布到 `gh-pages`，约 **2～5 分钟**上线（可在仓库 Actions 页面看进度）。

**本地写作（等价流程）**：

```powershell
# 1) 写 Markdown：src/content/posts/<slug>.md（frontmatter 见下图/现有模板）
# 2) 本地构建 + 体积检查
pnpm build        # 产物 dist/，末尾自动跑 check-size
pnpm size         # 只看体积
# 3) 提交并推送 main，触发 Actions 自动构建发布
git add src/content/posts/<slug>.md
git commit -m "feat: add <slug>"
git push origin main
```

**手动发布（备用，不走 Actions）**：本地 `pnpm build` 后运行 `powershell -ExecutionPolicy Bypass -File deploy\pages-deploy.ps1`（token 从 `$env:GITHUB_TOKEN` 读取，脚本内无明文 token），它会把 `dist/` 内容 + `.nojekyll` 推到 `gh-pages`。仅在 Actions 不可用时使用。

**手动触发 Action**：仓库 Actions → **Build & Deploy to GitHub Pages** → **Run workflow**（`workflow_dispatch`）。

### 0.5 发布后自检

```powershell
# Pages 站点状态（status / cname 应为 null / https_enforced / custom_404）
(Invoke-WebRequest "https://api.github.com/repos/Axolotl114/Axolotl114.github.io/pages" -Headers @{ Authorization = "Bearer $env:GITHUB_TOKEN"; "User-Agent" = "Axolotl114" } -UseBasicParsing).Content
# 最近一次构建（status 应为 built，error.message 为 null）
(Invoke-WebRequest "https://api.github.com/repos/Axolotl114/Axolotl114.github.io/pages/builds/latest" -Headers @{ Authorization = "Bearer $env:GITHUB_TOKEN"; "User-Agent" = "Axolotl114" } -UseBasicParsing).Content
# 远端产物文件数（= 最新构建的 dist 文件数 + 1 个 .nojekyll；以最新构建为准）
$t = (Invoke-WebRequest "https://api.github.com/repos/Axolotl114/Axolotl114.github.io/git/trees/gh-pages?recursive=1" -Headers @{ "User-Agent" = "Axolotl114" } -UseBasicParsing).Content | ConvertFrom-Json
($t.tree | Where-Object type -eq 'blob').Count
```

线上抽查（真实访问，无需等 DNS）：首页 `https://axolotl114.github.io/`、`/about/`、`/archive/`、`/search/`、`/pagefind/pagefind.js`、`/images/axo-bg-desktop.webp`、`/_astro/` 下的 CSS/JS 应全部 **200**；随便一个不存在的路径（如 `/no-such-page-xyz/`）应返回 **404** 并落到站内 `404.html`。

### 0.6 常见坑（GitHub Pages）

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 全站白屏 / 无样式，Console 报 `_astro/xxx.css` 404 | 少了 `.nojekyll`，Jekyll 吞掉下划线目录 | 补空 `.nojekyll` 后重新推送 |
| 访问 `axolotl114.github.io` 被 301 到 `axo.dpdns.org`（旧域名打不开） | 仓库里残留 `CNAME` 文件，或 Pages 设置里还有自定义域名 | 删掉 `gh-pages` 里的 `CNAME` 并 `PUT /pages {"cname": null}` |
| 地址变成 `axolotl114.github.io/axo-blog/` 且样式全丢 | 仓库名不是 `Axolotl114.github.io`（用户站点仓库必须是 `<user>.github.io`） | 仓库改名回 `Axolotl114.github.io`，或改用子路径并同步改 `base` |
| `https_enforced` 为 false | 用户站点一般默认 true，偶发设置未同步 | 仓库 **Settings → Pages → Enforce HTTPS** 勾选，或 `PUT /pages {"https_enforced": true}` |
| 推送 403 `Permission ... denied` | token 缺 `repo` scope / 已过期 | 重新生成 classic PAT（scope=repo），改用 `$env:GITHUB_TOKEN` 注入 |
| 仓库里混进源码 / `node_modules` | 在错误目录 `git add` | 只在 `_deploy\pages` 内 `git init` + `add -A`；推送前 `git ls-files` 条数 = 最新构建的 `dist` 文件数 + 1（`.nojekyll`） |
| 旧页面仍可访问 | 全量覆盖推送不会删远端多余文件 | 每次重建 `_deploy\pages` 后 `add -A` 提交，历史里已删文件会一并消失（或用 `git rm -r` 清理） |

---

## 0. 备用方案：宝塔主机一页速览（TL;DR）

```text
本地                              主机（宝塔）
────────────────────────────      ──────────────────────────────────────
pnpm install                     网站 → 添加站点（域名 axo.dpdns.org，纯静态）
pnpm build  ──►  dist/           删除默认 index.html / 404.html
pnpm size   （体积告警）         把 dist/ 里的“全部内容”上传到站点根目录
                                 粘贴 deploy/nginx-site.conf → 保存并重载
                                 SSL → Let's Encrypt → 强制 HTTPS
```

- 站点主线已迁至 **GitHub Pages 用户站点**（见 §0），本节起描述的是**宝塔备用方案**。
- **不要**用 Vercel / Cloudflare Pages 做自动部署（模板里相关配置保留但本项目不使用，见 §7）。
  GitHub Pages 主线（§0.4）：push 到 `main` → `.github/workflows/pages.yml` 自动 `pnpm build` 并发布 `dist/` 到 `gh-pages`；手动发布备用脚本为 `deploy/pages-deploy.ps1`。
- **不要**上传源码目录、`node_modules/`、`dist/` 文件夹本身（否则站点根目录会多一层 `dist/`）。
- 必须保证站点根目录下直接可见：`index.html`、`404.html`、`pagefind/`、`_astro/`、`images/`、`assets/`。
- 站点必须部署在**域名根路径**（`/`），因为 Pagefind 索引与站内资源使用 `/pagefind/...`、`/_astro/...` 绝对路径。

---

## 1. 部署目标与约束

| 项目 | 值 |
| --- | --- |
| 域名 | `axo.dpdns.org` |
| 主机 | moebun.com 宝塔虚拟主机（**不是 VPS**） |
| Web 服务器 | Nginx（宝塔面板管理） |
| 可用空间 / 数据库 / 带宽 | 300MB / 200MB / 30M |
| 可运行的服务 | **无**：不能常驻 Node、不能自建 MySQL/Redis、不能跑 Waline 这类独立后端 |
| 站点产物 | `dist/`（纯静态 HTML/CSS/JS/图片/搜索索引） |
| 上传位置 | 站点根目录，宝塔默认 `/www/wwwroot/axo.dpdns.org/` |
| 评论方案 | Giscus（纯前端，GitHub Discussions），详见 [`BACKEND-NOTES.md`](./BACKEND-NOTES.md) |

**结论**：整站是"静态文件 + 第三方浏览器端服务（Giscus）"的架构，主机只负责发文件，不需要任何服务端运行时。

---

## 2. 本地构建

### 2.1 环境要求

| 依赖 | 版本 | 说明 |
| --- | --- | --- |
| Node.js | `>= 22.23.0` | 见 `package.json` 的 `engines`；Astro 7 要求 Node 22+ |
| pnpm | `11.x` | 见 `packageManager`；`preinstall` 脚本会拒绝 npm/yarn 安装依赖 |

> Windows 提示：若 PowerShell 因执行策略拒绝 `npm.ps1`/`npx.ps1`，请改用 `pnpm.cmd`、`npm.cmd`；
> 也可以 `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` 后使用 `pnpm`。

### 2.2 构建命令

```powershell
# 仓库根目录 D:\blog
pnpm install        # 首次或依赖变更后执行一次
pnpm build          # 产物输出到 dist/
```

`pnpm build` 的实际链路（见 `package.json` 的 `scripts.build`）：

| 步骤 | 作用 |
| --- | --- |
| `generate-github-card-data.ts` | 预取 GitHub 卡片数据 |
| `generate-lqips.ts` | 为图片生成 LQIP 占位色（写入 `src/constants/lqips.json`） |
| `generate-vndb-covers.ts` | VNDB 封面（未配置时自动跳过） |
| `astro build` | 生成 `dist/` 静态页面 |
| `prune-pio-assets.ts` | 删除未启用的看板娘资源（否则 `public/pio` 会多拷 14.6MB 进 dist） |
| `subset-fonts.ts` | 字体子集化 |
| `minify-inline-scripts.ts` | 内联脚本压缩 |
| `run-pagefind.ts` | 生成站内搜索索引到 `dist/pagefind/` |
| `check-size.mjs` | **体积告警**（>50MB 大字警告、单文件 >5MB 警告、图片 >200KB 警告，不阻断构建） |

构建完成后先本地自检：

```powershell
pnpm size           # 等价于 node scripts/check-size.mjs，打印体积/top10/告警
```

### 2.3 产物核对与体积基线

构建成功后 `dist/` 根目录必须包含：

```text
dist/
├── index.html                 # 首页（必须有！）
├── 404.html                   # 自定义 404
├── _astro/                    # 带哈希的 CSS/JS/字体（可强缓存）
├── pagefind/                  # 站内搜索索引（纯客户端，必须整目录上传）
├── images/                    # 站点图片（背景图等）
├── assets/                    # 字体/音乐/图片等静态资源
├── posts/  archive/  tags/  categories/  series/  search/  about/ ...
├── sitemap-index.xml / sitemap-0.xml
├── robots.txt / rss.xml / atom.xml / llms.txt
```

**体积/页面数基线：** 最新本地构建 `dist = 8.90 MB / 219 文件 / 23 HTML / Pagefind 3 页`（内容清空后；发布时加 `.nojekyll` 共 220 个文件）。

> 2026-10 内容重建：模板演示内容已全部清空（`src/content/posts`、`dynamic`、`projects` 已为空；`src/data/friends`/`sponsors` 示例 JSON 与 `galleryConfig` 演示相册已清空），站点从空内容起步。
> 此前「23.31 MB / 309 文件 / 50 HTML / Pagefind 29 页」的基线已失效；每次构建后在仓库根目录跑 `pnpm size`（或看构建日志末尾 `check-size.mjs` 输出）获取真实数字。

| 指标 | 当前状态 |
| --- | --- |
| `dist/` 总体积 / 文件数 / HTML 页数 | **8.90 MB / 219 / 23**（空内容起步；随文章增加而增长） |
| Pagefind 索引页数 | **3 页**（首页/关于/留言板；文章为空时） |
| sitemap URL 数 | 以 `dist/sitemap-0.xml` 实际条目为准（`/admin/` 已排除） |

历史参考（内容清空前，仅备查）：`23.31 MB / 309 文件 / 50 HTML / Pagefind 29 页 / sitemap 40`。若后续继续迭代，同样以最新一次 `pnpm build` 的 `pnpm size` 输出为准。

### 2.4 资源体积管控

- 目标：`dist ≤ 50MB`（硬上限 50MB，告警阈值），上传到 300MB 空间后仍保留 ≥ 90% 余量；**当前实测以最新构建 `pnpm size` 为准**。
- 2026-10 内容重建（模板演示内容清空）：删除 `src/content/posts/**`（含模板演示文章、`meowtils/`、`guide/`、`posts/images/`）、`src/content/dynamic/**`、`src/content/projects/**`（含 `images/`），清空 `src/data/friends/*.json`、`src/data/sponsors/*.json` 与 `src/config/galleryConfig.ts` 的演示相册；`src/content/spec/about.md` 保留。空集合按空状态渲染（`src/pages/[...page].astro`、`src/pages/archive.astro` 已加空状态保护）。
- 已清理：`public/images/potpvp-directory/`（87 张封面截图，20.30MB，站点正文实际引用的是远端图床，本地副本无引用）。
- 已清理：`public/assets/fonts/Uranus_Pixel_11Px.ttf`（1.28MB，全仓库检索无引用）与 `public/assets/images/avatar - 副本.webp`（104KB，重复副本）。
- 历史记录（2026-10-24 第二次清理，随后内容又被整体清空）：`src/content/posts/addGuide.md` 删除（模板作者加群广告文）；`bilibili`/`bangumi`/`sponsor` 页面关闭（产物只剩 ~289B meta-refresh 占位页、不进 sitemap）；新增 `avatar-axo.webp`/`about-axo.webp` 替换模板头像/关于图。
- 保留：`public/assets/music/`（0.93MB）——`src/config/musicConfig.ts` 的 local 歌单仍在引用，虽然当前 `mode: "meting"` 未启用本地播放，但删掉会造成配置悬空引用，故保留（详见 [`ASSETS-GUIDE.md`](./ASSETS-GUIDE.md)）。
- 新增图片前请先读 [`ASSETS-GUIDE.md`](./ASSETS-GUIDE.md)：背景图 WebP、桌面 1920 宽 ≤200KB、移动 1080 宽 ≤100KB。
- 每次构建后 `pnpm build` 末尾自动跑 `scripts/check-size.mjs`，出现 `WARNING` 时先压缩大图再上传。

---

## 3. 宝塔面板建站（首次部署）

> 先做 DNS 解析（见 §5.1），否则添加站点/申请 SSL 都不顺。

### 3.1 添加站点

1. 宝塔面板 → **网站** → **添加站点**。
2. 域名：`axo.dpdns.org`。
3. 根目录：保持默认 ` /www/wwwroot/axo.dpdns.org`（记下它，上传目标就是这里）。
4. 数据库：**不创建**（本项目不需要数据库）。
5. PHP 版本：选择 **纯静态**。
   - 若面板版本没有"纯静态"选项，选"静态"，或选任意版本但确保不生成 PHP 处理配置；
   - 关键是静态文件由 Nginx 直接返回，不经过 PHP。
6. 提交后，宝塔会自动生成 `index.html`、`404.html` 等默认文件。

### 3.2 清空默认文件

在 **文件** 管理器中进入站点根目录，删除宝塔生成的默认文件：

```text
index.html      # 宝塔默认欢迎页，必须删，否则会顶掉站点首页
404.html        # 宝塔默认 404 页
.default.html   # 若有
```

> 保留 `.user.ini`（若有，纯静态站点也用不到，可留可删；**不要**把整个目录删空后忘记上传）。
> 站点根目录里**不要**出现源码文件（`package.json`、`src/` 等）。

### 3.3 上传 `dist/` 内容

**认准：上传 `dist/` 里面的内容，不是 `dist` 文件夹本身。**

推荐流程（宝塔文件管理器，最稳）：

```powershell
# 1. 本地把 dist 内容压成一个 zip（在 dist 目录内部选中所有内容再压缩）
cd D:\blog\dist
Compress-Archive -Path * -DestinationPath D:\blog\dist-site.zip -Force

# 2. 宝塔 → 文件 → 进入站点根目录 → 上传 dist-site.zip
# 3. 在线解压到站点根目录（解压后根目录直接是 index.html、_astro/、pagefind/ ...）
# 4. 删除 dist-site.zip，确认根目录结构，见 3.4
```

其它上传方式：

- **WinSCP / FileZilla（SFTP）**：本地进入 `D:\blog\dist`，全选内容拖到远端站点根目录；传输模式选二进制。
- **rclone / scp**：见 §8 与 `deploy/upload.example.ps1`。
- 上传完成后在宝塔文件管理器确认：根目录下 `index.html` 与 `404.html` 同级，不存在 `dist/dist` 嵌套。

### 3.4 上传后目录结构核对

站点根目录应为（`_astro`、`pagefind` 内容略）：

```text
/www/wwwroot/axo.dpdns.org/
├── index.html
├── 404.html
├── _astro/
├── pagefind/          # pagefind.js、pagefind-entry.json、fragment/、index/、wasm.unknown.pagefind ...
├── images/
├── assets/
├── posts/  archive/  tags/  categories/  series/  search/  about/ ...
├── sitemap-index.xml  sitemap-0.xml  robots.txt  rss.xml  atom.xml  llms.txt
```

- 文件属主/权限：宝塔默认 `www:www`，目录 `755`、文件 `644`，**不要 777**。
- 若上传后样式全丢：大概率是 `_astro/` 没传全（隐藏文件/断点续传问题），重新整包上传。

---

## 4. Nginx 配置（核心）

完整可复制片段见 **`deploy/nginx-site.conf`**（**纯 ASCII、无任何注释**，整份直接复制粘贴即可；带中文注释的讲解版见 `deploy/nginx.conf` 第 1 部分）。粘贴位置（二选一）：

- **方式 A（推荐）**：宝塔 → 网站 → `axo.dpdns.org` → 设置 → **配置文件**，在 `server { ... }` 内部（`#REWRITE-END` 之后）粘贴片段，保存（宝塔会自动 `nginx -t`）。
- **方式 B**：宝塔 → 网站 → 设置 → **伪静态**，粘贴同一片段（伪静态文件会被 include 进 server 块，`location` 指令可用）。

### 4.1 为什么必须配 `try_files`

站点是 `output: 'static'` + `trailingSlash: 'always'`，Astro 把页面输出成**目录形式**：

```text
请求 URL                实际文件
/posts/hello/    →      dist/posts/hello/index.html
/                →      dist/index.html
/rss.xml         →      dist/rss.xml
```

Nginx 默认 `index index.html;` 只处理目录，遇到 `/posts/hello`（无结尾斜杠）或旧链接就可能 404。核心配置：

```nginx
index index.html;

location / {
    # 目录存在但没有结尾斜杠 -> 301 到带斜杠的规范 URL（/posts/x -> /posts/x/）
    if (-d $request_filename) {
        rewrite ^(.*[^/])$ $1/ permanent;
    }
    # =404 而不是 /404.html：try_files 最后一项是 URI 时会内部跳转并返回 200；
    # 用 =404 才能保留 HTTP 404 状态码，再由 error_page 404 /404.html 渲染自定义页
    try_files $uri $uri/ $uri.html =404;
}

error_page 404 /404.html;
location = /404.html { internal; }
```

逐行说明：

- `if (-d $request_filename) { rewrite ... permanent; }`
  - 目录存在但 URL 缺少结尾斜杠时（如 `/posts/hello`），301 跳到 `/posts/hello/`。
  - 这样 `/posts/x` 和 `/posts/x/` 只有一个规范地址，避免搜索引擎收录两份、也避免相对链接错位。
  - 这是 Nginx `if` 的少数**安全用法**（纯 rewrite，不含其它指令）；`/`、`/rss.xml` 等不受影响。
- `$uri`：精确文件（如 `/rss.xml`、`/pagefind/pagefind.js`）
- `$uri/`：目录 → 命中后由 `index` 返回 `index.html`（兼容 `trailingSlash: always` 的目录形式）
- `$uri.html`：兼容个别 `.html` 单文件产物（如旧的 `/about.html` 链接）
- `=404`：都不命中 → 返回 HTTP **404** 状态码 → `error_page 404 /404.html` 输出自定义 404 页
  - ⚠️ 若把最后一项写成 `/404.html`（URI 形式），Nginx 会内部跳转并**返回 200**，搜索引擎/监控会误判为"页面存在"；因此推荐 `=404` + `error_page` 组合。

> 组合效果：`/posts/x/` 直接由目录 index 提供；`/posts/x` 301 到 `/posts/x/`；
> `/posts/x.html`（若存在）直接命中；不存在 → **HTTP 404 + 自定义 404 页面**。
> 已关闭的页面（`bilibili` / `bangumi` / `sponsor` 等）产物是 ~289B 的静态 meta-refresh 跳 `/404/` 占位页（HTTP 200 + `noindex`），Nginx 按普通 HTML 返回即可，无需特殊配置；`/404/` 本身不存在目录，会走上面的 404 处理。

### 4.2 片段逐条说明

| 片段 | 作用 | 为什么需要 |
| --- | --- | --- |
| `index index.html;` | 目录默认首页 | 目录形式路由 |
| `location / { try_files ... =404 }` | 静态路由 + 真 404 + 无斜杠 301 | 见 4.1（同时覆盖 `/posts/x/` 与 `/posts/x`；`=404` 保留 HTTP 404 状态码） |
| `error_page 404 /404.html;` | 自定义 404 | 站点有 `404.html` |
| `location = /404.html { internal; }` | 404 页仅内部使用 | 避免直接访问返回 200 |
| `location ^~ /_astro/` | 带哈希资源 1 年强缓存 | 文件名内容哈希，可安全 immutable |
| `location = /pagefind/pagefind-entry.json` | 索引入口禁止强缓存 | 否则站点更新后旧 entry 指向已删除分片，搜索 404 |
| `location ^~ /pagefind/` | 搜索索引分片缓存 7 天 | `zh-cn_<hash>.pf_*`、wasm 体积小、可缓存 |
| `types { application/wasm wasm; }` | wasm MIME 兜底 | 虚拟主机 mime.types 可能缺 `application/wasm` |
| `location ~* \.html$` | HTML `no-cache` | HTML 无哈希，必须每次校验更新 |
| `^~ /assets/fonts/`、`^~ /images/` | 字体/图片 30 天缓存 | 静态资源，更新时靠改文件名 |
| `gzip ...` | 压缩 | 省 30M 带宽、加快首屏 |
| 安全头 | 与模板 `vercel.json` 对齐 | 虚拟主机上补回 `nosniff` 等响应头 |

> 注意：宝塔自带 `location ~ .*\.(js|css)?$ { expires 12h; }` 等正则规则。
> 因为 `^~ /pagefind/`、`^~ /_astro/` 是前缀匹配且优先级高于正则 location，不会冲突；
> 而 `\.html$` 正则规则会命中 `try_files` 内部跳转后的 HTML，从而正确带上 no-cache。

### 4.3 保存与重载

- 宝塔保存配置时会自动执行 `nginx -t`，语法错误会拒绝保存（看弹窗报错）。
- 若手动改过：`/www/server/nginx/sbin/nginx -t && /www/server/nginx/sbin/nginx -s reload`。
- 重载后用浏览器强制刷新（`Ctrl+F5`）验证首页、文章页、搜索、404。

### 4.4 常见 Nginx 坑

| 现象 | 原因 | 处理 |
| --- | --- | --- |
| 首页显示宝塔欢迎页 | 默认 `index.html` 没删 | 删站点根目录默认 `index.html`，确认站点自己的 `index.html` 在 |
| 首页 403 | 根目录没有 `index.html` / 权限不对 | 重新上传；权限 755/644，属主 www |
| 文章页 404，但文件存在 | 没配 `try_files` | 加 §4.1 两行 |
| 全站样式丢失 | `_astro/` 未传全 | 重新上传 `_astro/` 整目录 |
| 搜索无结果/控制台 `/pagefind/...` 404 | `pagefind/` 未上传，或站点不在域名根路径 | 上传 `dist/pagefind/`；确认 `base: "/"` |
| 控制台 `Incorrect response MIME type` | wasm MIME 缺失 | 加 §4.2 的 `types` |
| 配置保存报错 `duplicate location` | 片段粘了两次 / 与伪静态重复 | 只保留一处 |
| 所有页面 404 且返回 nginx 默认页 | 站点根目录不是 dist 内容（多套了一层） | 删除多余 `dist/` 层级 |
| 不存在的 URL 返回 **200**（内容却是 404 页） | `try_files` 最后一项写成 `/404.html`（URI 会内部跳转返回 200） | 改为 `=404` + `error_page 404 /404.html`（§4.1 已给出推荐写法） |
| 访问 `/bilibili/`、`/bangumi/`、`/sponsor/` 看到"Redirecting to /404/" | 这些页面已在配置中关闭，产物是 ~289B 的静态 meta-refresh 占位页 | 正常行为（`noindex` + canonical，不进 sitemap）；若要直接 404，可加 `location = /bilibili/ { return 404; }` 等（可选） |

---

## 5. HTTPS / SSL

### 5.1 DNS 解析（先做）

`axo.dpdns.org` 是 dpdns.org 的免费子域名，先去 **dpdns.org 的域名管理面板**（或你托管该域名的 DNS 服务商，如 Cloudflare）：

1. 添加 **A 记录**：主机记录 `axo`，记录值填 moebun 主机提供的 **IPv4 地址**，TTL 600（默认）。
2. 保存后等待生效（通常 1～10 分钟，最长可达 24 小时）。
3. 本地验证：

```powershell
nslookup axo.dpdns.org 8.8.8.8
# 或
Resolve-DnsName axo.dpdns.org
```

4. 浏览器访问 `http://axo.dpdns.org/`，能打开站点即解析 OK。
5. 若使用 Cloudflare 代理（小黄云）：**申请证书阶段先切成"仅 DNS"**，等 Let's Encrypt 签发成功后再决定是否开代理；开代理后必须把 Cloudflare SSL 模式设为 `Full (strict)`，避免重定向循环。

> ⚠️ 备案提醒：如果 moebun 主机位于中国大陆，未备案域名（dpdns.org 无法备案）无法通过 80/443 正常访问，也无法申请 Let's Encrypt。
> 此时请改用香港/海外线路，或给站点换一个可备案的域名。**这是建站能否上线的硬前提**，先与主机商确认机房位置。

### 5.2 宝塔申请 Let's Encrypt 证书

1. 宝塔 → 网站 → `axo.dpdns.org` → 设置 → **SSL**。
2. 选择 **Let's Encrypt** → 勾选域名 `axo.dpdns.org` → 验证方式选 **文件验证（HTTP-01）**。
3. 点击申请，等待 10～60 秒；成功后证书会自动部署到站点。
4. 打开 **强制 HTTPS** 开关（宝塔会写入 80→443 跳转）。
5. 宝塔默认已配置证书自动续期任务（计划任务里可看到 `续签Let's Encrypt证书`），保留即可。

### 5.3 生效检查

```powershell
# HTTP 应 301/302 到 HTTPS
curl.exe -I http://axo.dpdns.org/

# HTTPS 应 200，且证书有效
curl.exe -I https://axo.dpdns.org/

# 查看证书域名与有效期
openssl s_client -connect axo.dpdns.org:443 -servername axo.dpdns.org < NUL | openssl x509 -noout -subject -dates
```

浏览器验证：地址栏锁标正常、无"混合内容"警告（本站资源均为相对/绝对同源路径，正常不会混合内容；若评论 iframe 加载失败见 §10）。

### 5.4 申请失败的常见原因

| 原因 | 现象 | 处理 |
| --- | --- | --- |
| DNS 未生效 | 验证文件访问不到 | 等 TTL 过后重试，`nslookup` 确认解析到主机 IP |
| 80 端口不通 / 主机拦截 | HTTP-01 校验失败 | 确认宝塔放行 80，安全组/防火墙放行；CDN 先关代理 |
| 主机在国内且域名未备案 | 80/443 被阻断 | 换海外/香港主机或换可备案域名（见 §5.1 提醒） |
| 证书 90 天到期未续 | 浏览器报证书过期 | 检查宝塔计划任务中的续签任务是否启用 |
| 域名解析到旧 IP | 访问到其他站点 | 修正 A 记录后清理本地 DNS 缓存 `ipconfig /flushdns` |

---

## 6. 发布与更新流程

### 6.1 标准发布步骤

```text
1. pnpm build                       # 本地构建
2. pnpm size                        # 看体积告警（>50MB / 单文件 >5MB / 图片 >200KB）
3. 备份上一个可用的 dist 包（本地保留 dist-YYYYMMDD.zip，便于回滚）
4. 上传：
   a) 先传 _astro/ 与 pagefind/（带哈希/分片，旧 HTML 仍引旧文件，不会互相破坏）
   b) 再传 HTML 与其余目录（覆盖）
   c) 清理远端已被删除页面的残留目录（见 6.2）
5. 浏览器强制刷新验证（见 §9 验收清单）
```

### 6.2 远端旧文件清理

静态站点"覆盖上传"不会删除已经不存在的页面，旧文章目录会一直留在主机上（占空间、可能被直接访问到）。处理方式：

- **rclone**：`rclone sync dist/ moebun:/www/wwwroot/axo.dpdns.org/ --progress`（会删除远端多余文件；**务必确认远端路径是站点根目录**）。
- **宝塔文件管理器**：每次发布前把站点根目录内旧内容删除再全量上传（发布期间会有短暂空窗，适合低流量站点）。
- 不建议只删 `dist/` 中"看起来是旧的"目录，容易误删 `_astro` 共享 chunk。

### 6.3 回滚

- 本地保留最近 1～2 个 `dist-YYYYMMDD.zip`；出问题时清空站点根目录后重新解压旧包。
- 宝塔"网站 → 备份"也可以对站点目录做整站备份（注意 300MB 空间配额，别保留太多份）。

---

## 7. 模板自带的部署配置（Vercel / Cloudflare / GitHub Actions）

本项目当前部署目标是 **GitHub Pages**（§0：`main` → Actions → `gh-pages`），宝塔手动上传作为备用（§1～§10）。模板自带的平台配置**保留不删**，但按以下方式处理：

| 文件/目录 | 模板用途 | 本项目处理 |
| --- | --- | --- |
| `.github/workflows/pages.yml` | **本项目新增**：push `main` / 手动触发 → `pnpm install` + `pnpm build` → `peaceiris/actions-gh-pages` 发布 `dist/` 到 `gh-pages`（自动 `.nojekyll`） | **启用，是当前唯一自动发布通道**（见 §0.4）；构建时带 `GITHUB_TOKEN` 避免 GitHub 卡片数据限流 |
| `.github/workflows/build.yml` | push/PR 构建 + `astro check` | 保留（CI 检查，不发布） |
| `.github/workflows/biome.yml` | Biome 代码质量检查 | 保留（CI 检查，不发布） |
| `vercel.json` | Vercel 部署配置（构建命令、输出目录、缓存头） | **保留，不生效**。不执行 `vercel` 部署；其缓存/安全头语义若走宝塔备用方案，已在 `deploy/nginx.conf` 中等价实现 |
| `wrangler.jsonc` | Cloudflare Workers/Pages 静态资源配置 | **保留，不生效**。不要设置 `CF_WORKERS` 环境变量（见下方注意） |
| `.github/dependabot.yml`、`ISSUE_TEMPLATE/` 等 | 仓库维护 | 无部署影响，保留 |
| `astro.config.mjs` 的 `@astrojs/cloudflare` 适配器 | 仅当 `process.env.CF_WORKERS` 存在时启用 | 构建/本机不要设置 `CF_WORKERS`，保持 `output: 'static'` 产物结构（`dist/` 根目录直接是站点） |

> 模板原有的「手动构建 + 上传 `dist` artifact」工作流（`deploy.yml`）已删除：自动发布统一走 `pages.yml`；需要人工出包时本地 `pnpm build` 即可。
> 备用手动发布：`deploy/pages-deploy.ps1`（本地构建后直接推 `gh-pages`，不依赖 Actions）。

> ⚠️ 若误设 `CF_WORKERS=1` 再构建，产物会变成 Cloudflare 适配器结构（静态资源在 `dist/client/` 等），**不能**直接上传到虚拟主机站点根目录。
> 部署前确认：`astro.config.mjs` 里 `output: 'static'`、`adapter` 为 `undefined`。

---

## 8. 上传工具与示例脚本

### 8.1 宝塔文件管理器（推荐，零安装）

见 §3.3：本地压缩 `dist` 内容为 zip → 上传到站点根目录 → 在线解压 → 删 zip。

### 8.2 WinSCP / FileZilla（SFTP）

- 主机：moebun 提供的 IP/域名；端口 22；协议 SFTP；账号密码由主机商给出。
- 本地路径：`D:\blog\dist`；远端路径：站点根目录。
- 拖拽上传（全选内容，不要拖 `dist` 文件夹本身）；传输类型二进制。
- 工具里可设置「同步」功能做增量，但**先用预览**，避免误删远端文件。

### 8.3 rclone / scp

```powershell
# rclone（先在 rclone config 里配好 SFTP 远端，如 moebun）
rclone sync "D:\blog\dist" moebun:/www/wwwroot/axo.dpdns.org --dry-run --progress
rclone sync "D:\blog\dist" moebun:/www/wwwroot/axo.dpdns.org --progress

# scp（Windows 自带 OpenSSH 客户端）
scp -P 22 -r "D:\blog\dist\*" axo@<主机IP>:/www/wwwroot/axo.dpdns.org/
```

### 8.4 示例脚本 `deploy/upload.example.ps1`

```powershell
# 只做前置检查（dist 存在 / 关键文件 / 体积 / HTML 数量）并打印命令，不联网
pwsh -NoProfile -File deploy/upload.example.ps1

# rclone 上传（先 dry-run 再正式同步）
pwsh -NoProfile -File deploy/upload.example.ps1 -Execute -Method rclone `
    -RcloneRemote moebun -RemotePath /www/wwwroot/axo.dpdns.org

# scp 上传
pwsh -NoProfile -File deploy/upload.example.ps1 -Execute -Method scp `
    -RemoteUser axo -RemoteHost 1.2.3.4 -RemotePath /www/wwwroot/axo.dpdns.org
```

脚本默认 `-Method check`，**必须显式加 `-Execute` 才会真的上传**，避免误操作。

---

## 9. 验收清单（每次发布后逐项勾）

| # | 检查项 | 方法 | 通过标准 |
| --- | --- | --- | --- |
| 1 | 首页 | 打开 `https://axo.dpdns.org/` | 200，背景图/导航/文章列表正常 |
| 2 | 文章页 | 随便点开一篇 | 200，正文图片、代码块、TOC 正常 |
| 3 | 旧链接兼容 | 访问 `/posts/<slug>`（无结尾斜杠） | 301 跳到 `/posts/<slug>/`，最终 200，不 404 |
| 4 | 404 | 访问 `/this-does-not-exist/` | 自定义 404 页面，HTTP 404 |
| 5 | 站内搜索 | 点搜索，输入关键词 | 出现结果，Network 里 `/pagefind/` 均 200 |
| 6 | 静态资源 | DevTools → Network | CSS/JS 来自 `/_astro/` 且 `Cache-Control: public, immutable`；HTML 为 `no-cache` |
| 7 | gzip | `curl.exe -I -H "Accept-Encoding: gzip" https://axo.dpdns.org/` | 响应含 `Content-Encoding: gzip` |
| 8 | HTTPS | 浏览器地址栏 | 锁标正常，http 自动跳 https |
| 9 | SSL 续期 | 宝塔 SSL 页 | 到期时间长（约 90 天），续签任务开启 |
| 10 | 评论 | 打开任意文章底部 | 显示 giscus 评论框（首次需先按 `BACKEND-NOTES.md` 填好配置） |
| 11 | 体积 | 本地 `pnpm size` | 无 WARNING，`dist ≤ 50MB` |
| 12 | 语言/编码 | 中文页面 | 无乱码（`Content-Type: text/html; charset=utf-8`） |

---

## 10. 常见问题（FAQ）

**Q1：上传后首页还是宝塔欢迎页？**
默认 `index.html` 没删，或站点根目录里有两个 `index.html`（多套了一层 `dist/`）。删默认页、调整层级。

**Q2：文章页能打开但样式/图片全丢？**
`_astro/`（以及 `images/`、`assets/`）没传全。重新上传对应目录；检查是否上传到了错误的子目录。

**Q3：站内搜索 404 / 一直转圈？**
`dist/pagefind/` 没上传或上传不完整；另外站点必须在域名根路径（`/pagefind/pagefind.js` 是绝对路径）。
若更新后搜索报错，检查 `pagefind-entry.json` 是否被强缓存（§4.2 已配置 no-cache）。

**Q4：更新了文章，浏览器还是旧内容？**
HTML 已配置 no-cache；若仍旧，检查是否 CDN/浏览器强缓存，`Ctrl+F5` 或清 CDN 缓存。
`pagefind-entry.json` 禁止强缓存后，搜索索引会随发布更新。

**Q5：评论框空白 / 控制台 giscus 报错？**
`src/config/commentConfig.ts` 里还是占位值。按 [`BACKEND-NOTES.md`](./BACKEND-NOTES.md) 的 Giscus 步骤生成真实的 `repo/repoId/category/categoryId` 后重新构建上传。

**Q6：300MB 空间够吗？**
站点约 26MB（清理后），加上 1～2 个备份 zip 约 50～80MB，仍远低于 300MB。注意别把 `node_modules`、源码、旧日志传到主机上。

**Q7：上传很慢/中断？**
dist 约 400 个文件、26MB，正常应在几分钟内完成。优先整包 zip 上传再解压，比逐文件 SFTP 快且不容易漏文件。

**Q8：能开 HTTP/2、HTTP/3 吗？**
HTTPS 生效后宝塔默认启用 HTTP/2（`listen 443 ssl http2`）。HTTP/3 需要额外配置，本项目不要求。

---

## 附录 A：命令速查

```powershell
# 构建与体积检查
pnpm install
pnpm build              # 构建 + 自动体积告警
pnpm size               # 单独跑体积检查
node scripts/check-size.mjs

# 产物自检
Test-Path dist/index.html
Test-Path dist/pagefind/pagefind.js
(Get-ChildItem dist -Recurse -File | Measure-Object Length -Sum).Sum / 1MB

# 打包上传
cd dist; Compress-Archive -Path * -DestinationPath ..\dist-site.zip -Force

# 线上验证
curl.exe -I https://axo.dpdns.org/
curl.exe -I https://axo.dpdns.org/pagefind/pagefind.js
curl.exe -I https://axo.dpdns.org/this-does-not-exist/
nslookup axo.dpdns.org 8.8.8.8
```

## 附录 B：关键路径

| 内容 | 路径 |
| --- | --- |
| Nginx 片段（生产用，纯 ASCII 无注释） | [`deploy/nginx-site.conf`](./deploy/nginx-site.conf) |
| Nginx 片段（带中文注释讲解版） | [`deploy/nginx.conf`](./deploy/nginx.conf) |
| 上传示例脚本 | [`deploy/upload.example.ps1`](./deploy/upload.example.ps1) |
| 体积检查脚本 | `scripts/check-size.mjs` |
| 体积规范 | [`ASSETS-GUIDE.md`](./ASSETS-GUIDE.md) |
| 静态能力评估（搜索/评论） | [`BACKEND-NOTES.md`](./BACKEND-NOTES.md) |
| 评论配置 | `src/config/commentConfig.ts` |
| 构建配置 | `astro.config.mjs`（`output: 'static'`、`trailingSlash: 'always'`） |

## 附录 C：基线数据复现

```powershell
# 总体积与文件数
$f = Get-ChildItem dist -Recurse -File
"files={0} totalMB={1:N2}" -f $f.Count, (($f | Measure-Object Length -Sum).Sum / 1MB)

# 页面数 / sitemap 数
(Get-ChildItem dist -Recurse -File -Filter *.html).Count
([xml](Get-Content dist/sitemap-0.xml)).urlset.url.Count

# 各目录体积
Get-ChildItem dist | ForEach-Object {
  if ($_.PSIsContainer) {
    $s = (Get-ChildItem $_.FullName -Recurse -File | Measure-Object Length -Sum).Sum
    "{0,-16} {1,8:N2} MB" -f $_.Name, ($s / 1MB)
  } else { "{0,-16} {1,8:N2} MB" -f $_.Name, ($_.Length / 1MB) }
} | Sort-Object

# Pagefind 索引页数（看构建日志或 pagefind-entry.json）
Get-Content dist/pagefind/pagefind-entry.json
# 形如：{"version":"1.5.2","languages":{"zh-cn":{"hash":"zh-cn_<hash>",...,"page_count":<N>}},...}
# 注：2026-10 内容重建后页面数会变化，以最新构建输出为准。
```

**最新复现结果**：内容重建（演示内容清空）后，`dist` 文件数 / 总体积 / HTML 页数 / sitemap 数 / Pagefind 索引页数**均以最新一次 `pnpm build` 的 `pnpm size` 与构建日志为准**；历史参考（清空前）：`files=309 totalMB=23.31 HTML=50 sitemap=40 pagefind=29`。
