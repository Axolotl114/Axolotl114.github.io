<#
.SYNOPSIS
  发布 Axo 博客到 GitHub Pages 用户站点（仓库 Axolotl114/Axolotl114.github.io 的 gh-pages 分支）。

.DESCRIPTION
  流程：pnpm build → 复制 dist\ 的【内容】到 _deploy\pages → 补 0 字节 .nojekyll
        → git add/commit → 用 $env:GITHUB_TOKEN 内联 Authorization 推送 gh-pages。
  安全：token 只从环境变量 GITHUB_TOKEN 读取，绝不写入 git remote、.git/config、
        工作区文件或提交内容；推送时用 -c http.https://github.com/.extraheader=
        一次性注入，命令结束后不残留。

  站点说明：仓库名 Axolotl114.github.io 是 GitHub 的「用户站点」仓库，
  站点直接落在 https://axolotl114.github.io/ 根路径，因此 Astro 的 base: "/"
  与 /_astro/... 绝对路径原样可用。_astro/ 以下划线开头，GitHub Pages 默认的
  Jekyll 会忽略它，必须靠 0 字节的 .nojekyll 关闭 Jekyll，否则全站样式/脚本 404。
  不使用自定义域名，所以**不要**生成 CNAME 文件（会触发 301 到旧域名）；
  HTTPS 由 *.github.io 标配，无需任何 DNS 配置。

.EXAMPLE
  $env:GITHUB_TOKEN = "<classic PAT，scope=repo>"   # 只放环境变量，脚本内不留明文 token
  powershell -ExecutionPolicy Bypass -File deploy\pages-deploy.ps1

.EXAMPLE
  # 构建已锁定、只想把当前 dist 重新发布
  powershell -ExecutionPolicy Bypass -File deploy\pages-deploy.ps1 -SkipBuild

.EXAMPLE
  # 只准备部署目录、打印结果，不推送
  powershell -ExecutionPolicy Bypass -File deploy\pages-deploy.ps1 -SkipPush
#>
[CmdletBinding()]
param(
	[string]$Repo = "Axolotl114/Axolotl114.github.io",
	[string]$Branch = "gh-pages",
	[string]$SiteUrl = "https://axolotl114.github.io/",
	[string]$CommitName = "Axo",
	[string]$CommitEmail = "294813744+Axolotl114@users.noreply.github.com",
	[switch]$SkipBuild,
	[switch]$SkipPush
)

$ErrorActionPreference = "Stop"

$root      = Split-Path -Parent $PSScriptRoot      # 仓库根 D:\blog
$distDir   = Join-Path $root "dist"
$deployDir = Join-Path $root "_deploy\pages"

function Step([string]$msg) { Write-Host ""; Write-Host "==> $msg" -ForegroundColor Cyan }
function Fail([string]$msg) { Write-Host "ERROR: $msg" -ForegroundColor Red; exit 1 }

# Windows PowerShell 5.1 会把 native 命令的 stderr 当错误抛出（EAP=Stop 时直接中断），
# 这里临时切到 Continue 并合并 2>&1，统一由返回的 Code 判断成败。
function Invoke-Cmd {
	param(
		[string]$Exe,
		[string[]]$CmdArgs,
		[switch]$Quiet
	)
	$oldEap = $ErrorActionPreference
	$ErrorActionPreference = "Continue"
	try {
		$out = & $Exe @CmdArgs 2>&1
		$code = $LASTEXITCODE
	} finally {
		$ErrorActionPreference = $oldEap
	}
	$lines = @($out | ForEach-Object { "$_" })
	if (-not $Quiet) { foreach ($l in $lines) { Write-Host ("  {0}" -f $l) } }
	return [pscustomobject]@{ Code = $code; Lines = $lines }
}

# ---------------------------------------------------------------- 0) 环境检查
Step "检查环境"
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Fail "找不到 git" }

$pnpmExe = $null
if (-not $SkipBuild) {
	# npm.ps1 / npx.ps1 可能被执行策略禁用，优先用 .cmd；本机 Node 在 E:\ds_harness\.tools
	if (Test-Path "E:\ds_harness\.tools") {
		$env:PATH = "E:\ds_harness\.tools\node-v22.23.2-win-x64;E:\ds_harness\.tools\npm-global;" + $env:PATH
		$env:NPM_CONFIG_CACHE = "E:\ds_harness\.tools\npm-cache"
	}
	$pnpmCmd = Get-Command pnpm.cmd -ErrorAction SilentlyContinue
	if (-not $pnpmCmd) { $pnpmCmd = Get-Command pnpm -ErrorAction SilentlyContinue }
	if (-not $pnpmCmd) { Fail "找不到 pnpm（需要 Node 22+ / pnpm 11）" }
	$pnpmExe = $(if ($pnpmCmd.Path) { $pnpmCmd.Path } else { $pnpmCmd.Source })
} else {
	Write-Host "跳过构建（-SkipBuild）"
}

# ---------------------------------------------------------------- 1) 构建
if (-not $SkipBuild) {
	Step "pnpm build（产物 dist\）"
	Push-Location $root
	try {
		$r = Invoke-Cmd $pnpmExe @("build")
		if ($r.Code -ne 0) { Fail "pnpm build 失败（exit $($r.Code)）" }
	} finally {
		Pop-Location
	}
}

if (-not (Test-Path $distDir)) { Fail "dist\ 不存在：$distDir" }
$distFiles = (Get-ChildItem $distDir -Recurse -Force -File).Count
$htmlCount = (Get-ChildItem $distDir -Recurse -File -Filter *.html).Count
Write-Host ("dist: {0} 个文件 / {1} 个 HTML" -f $distFiles, $htmlCount)
if (-not (Test-Path (Join-Path $distDir "index.html"))) { Fail "dist\index.html 不存在，构建产物不完整" }

# ---------------------------------------------------------------- 2) 准备部署目录
Step "准备部署目录 $deployDir"
New-Item -ItemType Directory -Path $deployDir -Force | Out-Null
# 只清内容，保留 .git 以便增量提交（推送是 --force 全量，本地历史不影响远端内容）
Get-ChildItem $deployDir -Force | Where-Object { $_.Name -ne ".git" } |
	ForEach-Object { Remove-Item -LiteralPath $_.FullName -Recurse -Force }
# 复制 dist 的【内容】，不复制 dist 目录本身
Get-ChildItem $distDir -Force |
	ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $deployDir -Recurse -Force }

# 必需元文件：0 字节 .nojekyll（关闭 Jekyll，保住 _astro/）
[System.IO.File]::WriteAllBytes((Join-Path $deployDir ".nojekyll"), @())
# 防御：用户站点不能用自定义域名，残留的 CNAME 会把站点 301 到旧域名
$cnamePath = Join-Path $deployDir "CNAME"
if (Test-Path $cnamePath) {
	Remove-Item -LiteralPath $cnamePath -Force
	Write-Host "已移除残留的 CNAME（用户站点不使用自定义域名）" -ForegroundColor Yellow
}

$deployFiles = @(Get-ChildItem $deployDir -Recurse -Force -File | Where-Object { $_.FullName -notmatch '\\\.git\\' }).Count
Write-Host ("部署目录: {0} 个文件（期望 dist 文件数 + 1 = {1}，只多 .nojekyll）" -f $deployFiles, ($distFiles + 1))
if ($deployFiles -ne ($distFiles + 1)) { Fail "部署目录文件数不符：$deployFiles != $($distFiles + 1)" }
if (Test-Path (Join-Path $deployDir "CNAME")) { Fail "部署目录里不应存在 CNAME" }

# ---------------------------------------------------------------- 3) git 提交
Step "提交到本地 $Branch 分支"
Push-Location $deployDir
try {
	if (-not (Test-Path (Join-Path $deployDir ".git"))) {
		if ((Invoke-Cmd git @("init", "-b", $Branch)).Code -ne 0) { Fail "git init 失败" }
	}
	if ((Invoke-Cmd git @("config", "core.quotepath", "false")).Code -ne 0) { Fail "git config 失败" }

	$current = (Invoke-Cmd git @("rev-parse", "--abbrev-ref", "HEAD") -Quiet).Lines -join ""
	if ($current.Trim() -ne $Branch) {
		if ((Invoke-Cmd git @("checkout", "-B", $Branch)).Code -ne 0) { Fail "切换到分支 $Branch 失败" }
	}

	$ident = @("-c", "user.name=$CommitName", "-c", "user.email=$CommitEmail")
	if ((Invoke-Cmd git ($ident + @("add", "-A"))).Code -ne 0) { Fail "git add 失败" }

	$tracked = @((Invoke-Cmd git @("ls-files") -Quiet).Lines).Count
	Write-Host "git ls-files: $tracked 个文件"
	$bad = @((Invoke-Cmd git @("ls-files") -Quiet).Lines | Select-String -Pattern 'node_modules|^dist/|^src/|^_deploy/' -CaseSensitive:$false)
	if ($bad.Count -gt 0) { Fail "暂存区混入了不该发布的路径：`n$($bad -join "`n")" }
	foreach ($must in @(".nojekyll", "index.html", "404.html")) {
		if ((Invoke-Cmd git @("ls-files", "--error-unmatch", $must) -Quiet).Code -ne 0) { Fail "缺少必需文件：$must" }
	}
	if ((Invoke-Cmd git @("ls-files", "--error-unmatch", "CNAME") -Quiet).Code -eq 0) { Fail "CNAME 不应被发布（用户站点不用自定义域名）" }

	$commitMsg = "deploy: axolotl114.github.io static build ($(Get-Date -Format 'yyyy-MM-dd'))"
	$commitCode = (Invoke-Cmd git ($ident + @("commit", "-m", $commitMsg))).Code
	if ($commitCode -ne 0) { Write-Host "无变更可提交（内容与上次发布一致），继续推送" -ForegroundColor Yellow }

	# ------------------------------------------------------------ 4) 推送
	if ($SkipPush) {
		Step "跳过推送（-SkipPush）"
	} else {
		Step "推送到 https://github.com/$Repo.git ($Branch)"
		$token = $env:GITHUB_TOKEN
		if (-not $token) { Fail "未设置环境变量 GITHUB_TOKEN（classic PAT，scope=repo）" }
		$basic = [Convert]::ToBase64String([System.Text.Encoding]::ASCII.GetBytes("x-access-token:$token"))
		$header = "AUTHORIZATION: basic $basic"
		# token 仅存在于本进程内存与本条 git 命令的 -c 参数中，不落盘
		$pushArgs = @("-c", "http.https://github.com/.extraheader=$header", "push", "--force",
			"https://github.com/$Repo.git", "${Branch}:${Branch}")
		if ((Invoke-Cmd git $pushArgs).Code -ne 0) { Fail "git push 失败（检查 token 的 repo scope / 仓库名）" }
	}
} finally {
	Pop-Location
}

# ---------------------------------------------------------------- 5) 完成
Step "完成"
if (-not $SkipPush) {
	Write-Host "已推送 $Branch 分支：https://github.com/$Repo" -ForegroundColor Green
	Write-Host "GitHub Pages 通常 30s 内重建完成；站点地址：$SiteUrl" -ForegroundColor Green
	Write-Host "构建状态：https://api.github.com/repos/$Repo/pages/builds/latest" -ForegroundColor DarkGray
	Write-Host "无需 DNS / 证书配置：*.github.io 标配 HTTPS（https_enforced 默认 true）" -ForegroundColor Yellow
} else {
	Write-Host "部署目录已就绪（未推送）：$deployDir"
}
