@echo off
if exist "%~dp0DrawingBridgeManager.exe" (
  start "" "%~dp0DrawingBridgeManager.exe"
  exit /b 0
)
echo Run install.cmd first to prepare the desktop manager.
pause
