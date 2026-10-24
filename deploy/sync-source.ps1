<#
.SYNOPSIS
  把 D:\blog 的「最小源码集」同步到 GitHub 仓库的 main 分支（源码分支）。

.DESCRIPTION
  仓库 Axolotl114/Axolotl114.github.io 采用「main = 源码，gh-pages = 构建产物」：
    - main 由本脚本推送（只含构建所需的最小源码白名单，不含 dist/node_modules/docs 等）；
    - .github/workflows/pages.yml 在 main 更新后自动 pnpm build 并把 dist/ 发布到 gh-pages；
    - Pages 的 Source 保持 gh-pages 分支，站点 https://axolotl114.github.io/ 不变。

  白名单（可通过参数微调）：
    根配置：astro.config.mjs / package.json / pnpm-lock.yaml / pnpm-workspace.yaml /
            postcss.config.mjs / svelte.config.js / tsconfig.json / .npmrc /
            biome.json / pagefind.yml / .gitattributes / .gitignore /
            README.md / DEPLOY.md / LICENSE
    目录：  src/  public/（默认排除 public/pio 与 public/vndb-covers）  scripts/  deploy/
    工作流：.github/workflows/pages.yml
  排除：dist/ node_modules/ docs/ reference/ front/ services/ _tools/ _deploy/ _build.log
        以及 .agents/.skills/.dsh/.project 等本地工具目录。

  安全：token 只从环境变量 GITHUB_TOKEN 读取；只出现在单条 git 命令的
        -c http.https://github.com/.extraheader= 参数里，不写入 remote、.git/config、
        任何文件或提交内容。脚本会扫描暂存内容，发现疑似 token 直接中止。

  历史：先 fetch 远端 main 再 reset --hard，保证是**追加提交**而不是覆盖历史
        （不做 force push，避免冲掉用户在 main 上的正常提交）。

.EXAMPLE
  $env:GITHUB_TOKEN = "<classic PAT，scope=repo>"
  powershell -ExecutionPolicy Bypass -File deploy\sync-source.ps1

.EXAMPLE
  # 先看会推哪些文件、不真正推送
  powershell -ExecutionPolicy Bypass -File deploy\sync-source.ps1 -DryRun

.EXAMPLE
  # 看板娘以后要重新启用时，把 public/pio 也带上（约 14.6 MB）
  powershell -ExecutionPolicy Bypass -File deploy\sync-source.ps1 -IncludePio

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File deploy\sync-source.ps1 -Message "feat: add /admin backend"
#>
[CmdletBinding()]
param(
	[string]$Repo = "Axolotl114/Axolotl114.github.io",
	[string]$Branch = "main",
	[string]$Message = "",
	[string]$StagingDir = "",
	[switch]$IncludePio,
	[switch]$SkipWorkflowFiles,
	[switch]$DryRun
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot            # D:\blog
if (-not $StagingDir) { $StagingDir = Join-Path $root "_deploy\source" }

function Step([string]$msg) { Write-Host ""; Write-Host "==> $msg" -ForegroundColor Cyan }
function Fail([string]$msg) { Write-Host "ERROR: $msg" -ForegroundColor Red; exit 1 }

# Windows PowerShell 5.1：native stderr 在 EAP=Stop 下会中断，统一包一层
function Invoke-Cmd {
	param([string]$Exe, [string[]]$CmdArgs, [switch]$Quiet)
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

# ---------------------------------------------------------------- 白名单
$RootFiles = @(
	"astro.config.mjs", "package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml",
	"postcss.config.mjs", "svelte.config.js", "tsconfig.json", ".npmrc",
	"biome.json", "pagefind.yml", ".gitattributes", ".gitignore",
	"README.md", "DEPLOY.md", "LICENSE"
)
$RootDirs = @("src", "public", "scripts", "deploy")
$WorkflowFiles = @(".github/workflows/pages.yml")

# 这些东西一旦出现在暂存区就是配置错了
$ForbiddenPathPattern = '(^|/)(node_modules|dist|docs|reference|front|_deploy|_tools|_astro|\.astro|\.agents|\.skills|\.dsh|\.project|\.git|\.github/workflows/deploy\.yml)(/|$)|dist-site\.zip|_build\.log|package-lock\.json'

# ---------------------------------------------------------------- 0) 环境
Step "检查环境"
if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Fail "找不到 git" }
foreach ($f in $RootFiles) {
	if (-not (Test-Path (Join-Path $root $f))) { Fail "缺少必需文件：$f" }
}
foreach ($d in $RootDirs) {
	if (-not (Test-Path (Join-Path $root $d))) { Fail "缺少必需目录：$d" }
}
foreach ($f in $WorkflowFiles) {
	if (-not (Test-Path (Join-Path $root $f))) { Fail "缺少工作流：$f（先创建 .github/workflows/pages.yml）" }
}

$token = $env:GITHUB_TOKEN
if (-not $token -and -not $DryRun) { Fail "未设置环境变量 GITHUB_TOKEN（classic PAT，scope=repo）" }
$url = "https://github.com/$Repo.git"

# GitHub 要求 PAT 带 workflow scope 才能推送 .github/workflows/*。
# 先探测 token 的 scopes，缺 scope 就自动跳过工作流文件（否则整次推送都会被拒绝）。
if ($token -and -not $SkipWorkflowFiles) {
	try {
		$probe = Invoke-WebRequest -Uri "https://api.github.com/user" -Headers @{ Authorization = "Bearer $token"; "User-Agent" = "Axolotl114" } -UseBasicParsing
		$scopes = ($probe.Headers["X-OAuth-Scopes"] -join ",")
		Write-Host "token scopes: $scopes"
		if ($scopes -notmatch '\bworkflow\b') {
			Write-Host "token 没有 workflow scope：本次自动跳过 .github/workflows（GitHub 会拒绝推送工作流文件）" -ForegroundColor Yellow
			Write-Host "补法：换带 workflow scope 的 PAT 重跑，或在 GitHub 网页手工添加 .github/workflows/pages.yml" -ForegroundColor Yellow
			$SkipWorkflowFiles = $true
		}
	} catch {
		Write-Host "无法探测 token scope（$($_.Exception.Message)），按含 workflow 处理；若被拒会自动回退" -ForegroundColor DarkGray
	}
}

# ---------------------------------------------------------------- 1) 准备暂存目录
Step "准备暂存目录 $StagingDir"
New-Item -ItemType Directory -Path $StagingDir -Force | Out-Null

Push-Location $StagingDir
try {
	if (-not (Test-Path (Join-Path $StagingDir ".git"))) {
		if ((Invoke-Cmd git @("init", "-b", $Branch)).Code -ne 0) { Fail "git init 失败" }
	}
	if ((Invoke-Cmd git @("config", "core.quotepath", "false")).Code -ne 0) { Fail "git config 失败" }

	# 拉远端主线：存在就 reset 到它上面（追加提交），不存在就是首次播种
	$fetch = Invoke-Cmd git @("fetch", "--depth=1", $url, "refs/heads/$Branch") -Quiet
	if ($fetch.Code -eq 0) {
		if ((Invoke-Cmd git @("reset", "--hard", "FETCH_HEAD") -Quiet).Code -ne 0) { Fail "git reset --hard FETCH_HEAD 失败" }
		Write-Host "已对齐远端 $Branch（追加提交，不覆盖历史）" -ForegroundColor DarkGray
	} else {
		Write-Host "远端暂没有 $Branch 分支，本次为首个源码提交" -ForegroundColor darkgray
	}

	# 清理工作区（保留 .git 与远端已有的 .github/，避免把远端工作流/配置误删）
	# 增量语义：白名单里没有的东西不主动删远端已有的（尤其 .github/**）
	Get-ChildItem $StagingDir -Force |
		Where-Object { $_.Name -ne ".git" -and $_.Name -ne ".github" } |
		ForEach-Object { Remove-Item -LiteralPath $_.FullName -Recurse -Force }

	# ------------------------------------------------------------ 2) 复制白名单
	Step "复制源码白名单"
	foreach ($f in $RootFiles) {
		Copy-Item -LiteralPath (Join-Path $root $f) -Destination (Join-Path $StagingDir $f) -Force
	}

	Copy-Item -LiteralPath (Join-Path $root "src")     -Destination (Join-Path $StagingDir "src")     -Recurse -Force
	Copy-Item -LiteralPath (Join-Path $root "scripts") -Destination (Join-Path $StagingDir "scripts") -Recurse -Force
	Copy-Item -LiteralPath (Join-Path $root "deploy")  -Destination (Join-Path $StagingDir "deploy")  -Recurse -Force

	# public/：排除 pio（默认，约 14.6 MB 且当前两个看板娘都关着）与 vndb-covers（构建期生成）
	$publicDst = Join-Path $StagingDir "public"
	New-Item -ItemType Directory -Path $publicDst -Force | Out-Null
	$excludePublic = @("pio", "vndb-covers")
	if ($IncludePio) { $excludePublic = @("vndb-covers") }
	Get-ChildItem (Join-Path $root "public") -Force |
		Where-Object { $excludePublic -notcontains $_.Name } |
		ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $publicDst -Recurse -Force }
	if (-not $IncludePio) { Write-Host "已跳过 public/pio（看板娘都关闭；需要时加 -IncludePio）" -ForegroundColor DarkGray }

	# .github/workflows：只覆盖 Pages 发布工作流（远端 .github/ 下其它文件保持原样，不会被删）
	# 注意：classic PAT 必须有 `workflow` scope 才能推送 .github/workflows/*，
	# 否则 GitHub 会拒绝推送（refusing to allow a Personal Access Token ... without `workflow` scope）。
	if ($SkipWorkflowFiles) {
		Write-Host "已跳过 .github/workflows：保留远端现有工作流不动（token 无 workflow scope 时不会误删）" -ForegroundColor Yellow
	} else {
		foreach ($wf in $WorkflowFiles) {
			$dstFile = Join-Path $StagingDir $wf
			New-Item -ItemType Directory -Path (Split-Path -Parent $dstFile) -Force | Out-Null
			Copy-Item -LiteralPath (Join-Path $root $wf) -Destination $dstFile -Force
		}
	}

	# ------------------------------------------------------------ 3) 校验
	Step "校验暂存内容"
	if ((Invoke-Cmd git @("add", "-A") -Quiet).Code -ne 0) { Fail "git add 失败" }

	$staged = @((Invoke-Cmd git @("diff", "--cached", "--name-only", "--diff-filter=ACMR") -Quiet).Lines)
	Write-Host ("暂存文件数: {0}" -f $staged.Count)
	$bad = @($staged | Select-String -Pattern $ForbiddenPathPattern -CaseSensitive:$false)
	if ($bad.Count -gt 0) { Fail "白名单混入了不该发布到 main 的路径：`n$($bad -join "`n")" }
	if ($staged -contains "CNAME") { Fail "源码分支不应包含 CNAME（站点未使用自定义域名）" }

	$gitAttrs = (Invoke-Cmd git @("ls-files") -Quiet).Lines
	if (-not ($gitAttrs -contains "package.json")) { Fail "package.json 未进入暂存区" }
	if (-not $SkipWorkflowFiles -and -not ($gitAttrs | Where-Object { $_ -match '^\.github/workflows/pages\.yml$' })) { Fail "pages.yml 未进入暂存区" }

	# 扫一遍源码里有没有疑似真 token（防手滑）
	$leak = @()
	foreach ($rel in ($gitAttrs | Where-Object { $_ -notmatch '\.(png|jpg|jpeg|webp|avif|gif|ico|mp3|woff2?|ttf|otf|wasm)$' })) {
		$p = Join-Path $StagingDir $rel
		if (-not (Test-Path $p)) { continue }
		if (Select-String -Path $p -Pattern 'ghp_[A-Za-z0-9]{30,}' -ErrorAction SilentlyContinue) { $leak += $rel }
	}
	if ($leak.Count -gt 0) { Fail "疑似明文 token 出现在：`n$($leak -join "`n")" }

	$totalBytes = (Get-ChildItem $StagingDir -Recurse -Force -File | Where-Object { $_.FullName -notmatch '\\\.git\\' } | Measure-Object Length -Sum).Sum
	Write-Host ("暂存大小: {0:N2} MB" -f ($totalBytes / 1MB))

	# ------------------------------------------------------------ 4) 提交
	Step "提交到本地 $Branch"
	if (-not $Message) { $Message = "chore: sync source snapshot ($(Get-Date -Format 'yyyy-MM-dd HH:mm'))" }
	$ident = @("-c", "user.name=Axo", "-c", "user.email=294813744+Axolotl114@users.noreply.github.com")
	$commit = Invoke-Cmd git ($ident + @("commit", "-m", $Message))
	if ($commit.Code -ne 0) {
		Write-Host "工作区没有变化（与远端 main 一致），本次不产生提交" -ForegroundColor Yellow
		if ($DryRun) { Step "DryRun 结束"; return }
		# 无变更也允许继续走推送（幂等）
	}
	$headSha = (Invoke-Cmd git @("rev-parse", "--short", "HEAD") -Quiet).Lines -join ""

	# ------------------------------------------------------------ 5) 推送
	if ($DryRun) {
		Step "DryRun：不推送。待推送 commit $headSha"
		Write-Host "本地暂存目录：$StagingDir"
		return
	}

	Step "推送到 https://github.com/$Repo.git ($Branch)"
	$basic = [Convert]::ToBase64String([System.Text.Encoding]::ASCII.GetBytes("x-access-token:$token"))
	$header = "AUTHORIZATION: basic $basic"
	# token 仅存在于本进程内存与这条 git 命令的 -c 参数中，不落盘
	$pushArgs = @("-c", "http.https://github.com/.extraheader=$header", "push", $url, "HEAD:refs/heads/$Branch")
	$push = Invoke-Cmd git $pushArgs
	if ($push.Code -ne 0) {
		$scopeBlocked = @($push.Lines | Select-String -Pattern 'without .?workflow.? scope|refusing to allow' -CaseSensitive:$false).Count -gt 0
		if (-not $scopeBlocked) { Fail "git push 失败（token 权限 / 远端有新提交，重跑一次即可）" }

		Write-Host ""
		Write-Host "当前 token 缺少 workflow scope，GitHub 拒绝推送 .github/workflows/*。" -ForegroundColor Yellow
		Write-Host "先推源码（不含工作流），再按提示补工作流。" -ForegroundColor Yellow
		$wfDir = Join-Path $StagingDir ".github\workflows"
		if (Test-Path $wfDir) { Remove-Item -LiteralPath $wfDir -Recurse -Force }
		if ((Invoke-Cmd git @("add", "-A") -Quiet).Code -ne 0) { Fail "git add 失败" }
		# 改写刚才的 tip（不是追加提交），保证要推送的历史里根本不出现 workflow 路径
		$amend = Invoke-Cmd git ($ident + @("commit", "--amend", "-m", "chore: sync source (CI workflow excluded: PAT lacks workflow scope)"))
		if ($amend.Code -ne 0) { Write-Host "（无可 amend 的提交，直接重试推送）" -ForegroundColor DarkGray }
		$headSha = (Invoke-Cmd git @("rev-parse", "--short", "HEAD") -Quiet).Lines -join ""
		$push = Invoke-Cmd git $pushArgs
		if ($push.Code -ne 0) { Fail "去掉工作流后 push 仍然失败（token 权限 / 远端有新提交，重跑一次即可）" }

		Step "完成（源码已推送，工作流待补）"
		Write-Host "已推送 $Branch：https://github.com/$Repo（commit $headSha）" -ForegroundColor Green
		Write-Host "⚠ .github/workflows/pages.yml 没有上传成功，补法任选其一：" -ForegroundColor Yellow
		Write-Host "   A) 换有 workflow scope 的 classic PAT，重跑本脚本" -ForegroundColor Yellow
		Write-Host "   B) GitHub 网页 → Actions → New workflow（或直链）粘贴本机 .github\workflows\pages.yml 后 Commit" -ForegroundColor Yellow
		Write-Host "   直链：https://github.com/$Repo/new/$Branch/.github/workflows/pages.yml" -ForegroundColor DarkGray
		return
	}

	Step "完成"
	Write-Host "已推送 $Branch：https://github.com/$Repo（commit $headSha）" -ForegroundColor Green
	Write-Host "GitHub Actions 会自动构建并发布到 gh-pages；进度：https://github.com/$Repo/actions" -ForegroundColor Green
	Write-Host "站点（构建完成后）：https://axolotl114.github.io/" -ForegroundColor Green
} finally {
	Pop-Location
}
