@echo off
setlocal
cd /d "%~dp0"
echo ==========================================
echo VEXTRO BOT - Windows dependency installer
echo ==========================================
where node >nul 2>nul || (echo ERROR: Install Node.js 26 LTS or newer from https://nodejs.org/ & pause & exit /b 1)
for /f "tokens=1 delims=v" %%V in ('node --version') do set NODEVER=%%V
for /f "tokens=1 delims=." %%V in ("%NODEVER%") do set NODEMAJOR=%%V
if %NODEMAJOR% LSS 26 (echo ERROR: Node.js 26 or newer is required. Current: %NODEVER% & pause & exit /b 1)
if not exist ".env" (
  copy ".env.example" ".env" >nul
  echo Created .env. Edit it and add your Telegram and Supabase credentials before starting.
)
if not exist "package-lock.json" (echo ERROR: package-lock.json is missing from this release package. & pause & exit /b 1)
call npm ci --omit=dev --no-audit --no-fund
if errorlevel 1 (echo ERROR: Dependency installation failed. & pause & exit /b 1)
echo.
echo Installation complete. Edit .env, then run START.bat.
pause
