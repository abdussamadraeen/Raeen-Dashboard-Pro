@echo off
cd /d "%~dp0"
echo [Tor Engine] Stopping Tor and daemon processes...
taskkill /F /IM tor.exe >nul 2>nul
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :9052 ^| findstr LISTENING') do taskkill /F /PID %%a >nul 2>nul
echo [Tor Engine] Tor stopped successfully.
