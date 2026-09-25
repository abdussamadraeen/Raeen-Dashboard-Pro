@echo off
cd /d "%~dp0"
tasklist /FI "IMAGENAME eq tor.exe" 2>NUL | find /I /N "tor.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo [Privacy Proxy] Tor is already running on 127.0.0.1:9050.
) else (
    echo [Privacy Proxy] Starting Tor background daemon...
    powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0start-tor.ps1"
    echo [Privacy Proxy] Tor daemon launched on 127.0.0.1:9050.
)
