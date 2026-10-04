@echo off
rem Launcher for AI DEV TEAM V3. Put this folder (e.g. C:\AI-Team) on PATH, then run: aiteam start
where py >nul 2>nul
if %ERRORLEVEL%==0 (
  py -3 "%~dp0aiteam.py" %*
) else (
  python "%~dp0aiteam.py" %*
)
exit /b %ERRORLEVEL%
