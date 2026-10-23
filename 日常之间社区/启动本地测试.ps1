$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot
$env:NEXT_TELEMETRY_DISABLED='1'
$nodeCommand=Get-Command node -ErrorAction SilentlyContinue
if ($nodeCommand) { $communityNode=$nodeCommand.Source } else { $communityNode=Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe' }
if (-not (Test-Path -LiteralPath $communityNode)) { throw '需要 Node.js 24.15 或更新版本。' }
$version=& $communityNode -p 'process.versions.node'
if ([version]$version -lt [version]'24.15.0') { throw '需要 Node.js 24.15 或更新版本。' }
if (-not (Test-Path 'node_modules/next/package.json')) {
 Write-Host '首次启动正在安装依赖，请保持窗口打开。'
 & $communityNode 'vendor/npm/bin/npm-cli.js' ci --no-audit --no-fund
 if ($LASTEXITCODE -ne 0) { throw '依赖安装未完成，请检查网络后重新启动。' }
}
Write-Host '打开 http://localhost:3100 开始体验。请保持此窗口打开，按 Ctrl+C 可停止。'
& $communityNode 'scripts/launch.mjs' dev
