@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1" %*
if errorlevel 1 (
  echo Installation failed. Please check the message above.
  pause
  exit /b 1
)
echo Installation complete. See README.md for loading the browser extension and MCP plugin.
pause

