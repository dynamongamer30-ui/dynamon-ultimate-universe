@echo off
setlocal
cd /d "%~dp0"
if not exist ".env" (echo ERROR: .env is missing. Run INSTALL.bat first. & pause & exit /b 1)
if not exist "dist\index.js" (echo ERROR: Compiled runtime is missing from this package. & pause & exit /b 1)
findstr /r /c:"^BOT_TOKEN=." ".env" >nul || (echo ERROR: BOT_TOKEN is empty in .env. & pause & exit /b 1)
findstr /r /c:"^SUPABASE_SERVICE_ROLE_KEY=." ".env" >nul || (echo ERROR: SUPABASE_SERVICE_ROLE_KEY is empty in .env. & pause & exit /b 1)
echo Starting VEXTRO BOT. Keep this window open. Press Ctrl+C to stop.
call npm start
if errorlevel 1 (echo VEXTRO BOT stopped with an error. Review the log above. & pause)
