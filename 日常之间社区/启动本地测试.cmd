@chcp 65001 >nul
@echo off
cd /d "%~dp0"
set "COMMUNITY_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%COMMUNITY_NODE%" (
 "%COMMUNITY_NODE%" scripts\bootstrap.mjs
) else (
 where node >nul 2>&1
 if errorlevel 1 (
  echo 需要安装 Node.js 24.15 或更新版本。
  pause
  exit /b 1
 )
 node scripts\bootstrap.mjs
)
if errorlevel 1 pause
