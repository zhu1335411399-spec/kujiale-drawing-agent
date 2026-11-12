@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start.ps1" %*
if errorlevel 1 (
  echo Setup could not finish. Keep this window open and check the message above.
  pause
  exit /b 1
)

