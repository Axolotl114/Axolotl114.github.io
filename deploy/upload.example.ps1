# =============================================================================
# Axo 博客 — dist/ 上传到 moebun 宝塔虚拟主机 示例脚本
# -----------------------------------------------------------------------------
# 默认只做本地检查并打印命令（不联网、不删除远端文件），确认无误后加 -Execute。
#
# 用法（Windows PowerShell / pwsh，在仓库根目录执行）：
#   # 1) 只检查 dist 并打印将执行的命令
#   pwsh -NoProfile -File deploy/upload.example.ps1
#
#   # 2) 检查 + 通过 rclone 增量同步（需要本机已 `rclone config` 配好远端）
#   pwsh -NoProfile -File deploy/upload.example.ps1 -Execute `
#       -Method rclone -RcloneRemote moebun -RemotePath /www/wwwroot/axo.dpdns.org
#
#   # 3) 用 scp（SSH 端口、账号按主机商给的填）
#   pwsh -NoProfile -File deploy/upload.example.ps1 -Execute `
#       -Method scp -RemoteUser axo -RemoteHost 1.2.3.4 -RemotePath /www/wwwroot/axo.dpdns.org
#
# 安全提示：
#   * 上传的是 dist/ 里的“内容”，不是 dist 目录本身（否则站点根目录会多一层 dist/）。
#   * 不要对站点根目录以外的路径执行 --delete / Remove-Item。
#   * 首次建议先在宝塔里把站点根目录清空（见 DEPLOY.md），再全量上传。
# =============================================================================

[CmdletBinding()]
param(
    [string]$DistDir = "dist",
    [ValidateSet("check", "rclone", "scp")]
    [string]$Method = "check",
    [string]$RcloneRemote = "moebun",
    [string]$RemoteUser = "axo",
    [string]$RemoteHost = "1.2.3.4",
    [int]$RemotePort = 22,
    [string]$RemotePath = "/www/wwwroot/axo.dpdns.org",
    [switch]$Execute
)

$ErrorActionPreference = "Stop"

function Write-Step([string]$Text) { Write-Host "`n==> $Text" -ForegroundColor Cyan }
function Write-Ok([string]$Text) { Write-Host "    [OK] $Text" -ForegroundColor Green }
function Write-Warn([string]$Text) { Write-Host "    [WARN] $Text" -ForegroundColor Yellow }
function Write-Bad([string]$Text) { Write-Host "    [FAIL] $Text" -ForegroundColor Red }

# ---------------------------------------------------------------------------
# 1. 前置检查：dist 存在、关键文件齐全、体积正常
# ---------------------------------------------------------------------------
Write-Step "检查构建产物"

if (-not (Test-Path -LiteralPath $DistDir -PathType Container)) {
    Write-Bad "找不到目录 '$DistDir'，请先在仓库根目录执行 pnpm build"
    exit 1
}

$distFull = (Resolve-Path -LiteralPath $DistDir).Path
if (-not (Test-Path -LiteralPath (Join-Path $distFull "index.html"))) {
    Write-Bad "缺少 $DistDir/index.html —— 构建不完整或上传目录选错了"
    exit 1
}
Write-Ok "dist/index.html 存在"

if (-not (Test-Path -LiteralPath (Join-Path $distFull "404.html"))) {
    Write-Warn "缺少 404.html（error_page 会退回 nginx 默认 404 页）"
} else {
    Write-Ok "dist/404.html 存在"
}

if (-not (Test-Path -LiteralPath (Join-Path $distFull "pagefind/pagefind.js"))) {
    Write-Warn "缺少 pagefind/pagefind.js —— 站内搜索将不可用，检查 pnpm build 的 Pagefind 步骤"
} else {
    Write-Ok "dist/pagefind/pagefind.js 存在（站内搜索可用）"
}

if (-not (Test-Path -LiteralPath (Join-Path $distFull "_astro"))) {
    Write-Warn "缺少 _astro/ —— 页面资源引用会 404"
} else {
    Write-Ok "dist/_astro/ 存在"
}

$files = @(Get-ChildItem -LiteralPath $distFull -Recurse -File)
$totalBytes = ($files | Measure-Object -Property Length -Sum).Sum
$totalMB = [math]::Round($totalBytes / 1MB, 2)
$htmlCount = @($files | Where-Object { $_.Extension -eq ".html" }).Count

Write-Ok ("文件数 {0}，总体积 {1} MB，HTML {2} 个" -f $files.Count, $totalMB, $htmlCount)
if ($totalMB -gt 50) {
    Write-Warn "dist 超过 50MB 目标（软告警），上传前建议执行 pnpm size 看 top 10 大文件"
}

# 本地缓存差异提示：dist 根目录必须是“站点根”，不能出现 dist/dist
if (Test-Path -LiteralPath (Join-Path $distFull "dist")) {
    Write-Warn "发现 dist/dist/，说明上次有目录嵌套，注意上传时不要带这一层"
}

# ---------------------------------------------------------------------------
# 2. 上传方式
# ---------------------------------------------------------------------------
Write-Step "上传方式：$Method"

switch ($Method) {
    "check" {
        Write-Host @"
    仅检查模式。可用的上传命令示例：

    # A. rclone（推荐，支持 SFTP 后端，增量 + 可预演）
    rclone sync "$distFull" "${RcloneRemote}:${RemotePath}" --dry-run --progress
    rclone sync "$distFull" "${RcloneRemote}:${RemotePath}" --progress

    # B. WinSCP GUI：本地 $distFull -> 远端 $RemotePath（全选内容上传，勿整个 dist 文件夹）
    # C. scp -P $RemotePort -r "$distFull\*" "${RemoteUser}@${RemoteHost}:${RemotePath}/"
    # D. 宝塔文件管理器：把 dist 内所有内容压成 zip 上传后在线解压（见 DEPLOY.md）
"@ -ForegroundColor Gray
        Write-Warn "未加 -Execute，未执行任何上传。"
        exit 0
    }
    "rclone" {
        if (-not (Get-Command rclone -ErrorAction SilentlyContinue)) {
            Write-Bad "本机没有 rclone，请先安装并 rclone config 配置 SFTP 远端，或改用 -Method check / scp"
            exit 1
        }
        $remote = "${RcloneRemote}:${RemotePath}"
        Write-Host "    源: $distFull"
        Write-Host "    目标: $remote"
        Write-Host "    （先 --dry-run，再正式同步；远端只删“源里已不存在的旧文件”）"
        if (-not $Execute) {
            Write-Warn "未加 -Execute，仅打印命令："
            Write-Host "    rclone sync `"$distFull`" `"$remote`" --dry-run --progress"
            Write-Host "    rclone sync `"$distFull`" `"$remote`" --progress"
            exit 0
        }
        Write-Step "rclone --dry-run 预演"
        & rclone sync $distFull $remote --dry-run --progress
        if ($LASTEXITCODE -ne 0) { Write-Bad "rclone 预演失败，已中止"; exit $LASTEXITCODE }
        Write-Step "rclone 正式同步"
        & rclone sync $distFull $remote --progress
        if ($LASTEXITCODE -ne 0) { Write-Bad "rclone 同步失败"; exit $LASTEXITCODE }
        Write-Ok "rclone 同步完成"
    }
    "scp" {
        if (-not (Get-Command scp -ErrorAction SilentlyContinue)) {
            Write-Bad "本机没有 scp，请安装 OpenSSH 客户端，或改用 rclone / WinSCP / 宝塔文件管理器"
            exit 1
        }
        Write-Host "    源: $distFull\*"
        Write-Host "    目标: ${RemoteUser}@${RemoteHost}:${RemotePath}/ (端口 $RemotePort)"
        if (-not $Execute) {
            Write-Warn "未加 -Execute，仅打印命令："
            Write-Host "    scp -P $RemotePort -r `"$distFull\*`" `"${RemoteUser}@${RemoteHost}:${RemotePath}/`""
            exit 0
        }
        Write-Step "scp 上传"
        # 说明：scp 没有 --delete，远端残留的旧页面需要手动清理（见 DEPLOY.md「发布流程」）
        & scp -P $RemotePort -r "$distFull\*" "${RemoteUser}@${RemoteHost}:${RemotePath}/"
        if ($LASTEXITCODE -ne 0) { Write-Bad "scp 上传失败"; exit $LASTEXITCODE }
        Write-Ok "scp 上传完成"
    }
}

# ---------------------------------------------------------------------------
# 3. 上传后验证清单
# ---------------------------------------------------------------------------
Write-Step "上传后请在本地/浏览器验证"
Write-Host @"
    [ ] 首页 https://axo.dpdns.org/ 正常（背景图、样式、字体）
    [ ] 站内搜索：点搜索框输入关键词，能出结果（验证 /pagefind/ 已上传）
    [ ] 随便打开一篇旧文章 URL（带结尾斜杠），不应 404
    [ ] 打开不存在的地址，返回自定义 404 页面
    [ ] HTTPS 锁标正常；http 自动跳 https
    [ ] 开发者工具 Network：/_astro/*.css 带 immutable 缓存头；HTML 为 no-cache
    [ ] giscus 评论区能加载（需先在 commentConfig.ts 填好真实 repo/repoId/categoryId）
"@ -ForegroundColor Gray
