@echo off
cd /d "%~dp0"
title Tor Daemon & Control Bridge

echo ========================================================
echo   Workspace - Tor Onion Routing Daemon & Bridge
echo ========================================================
echo.

where node >nul 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [Tor Engine] Node.js runtime detected.
    echo [Tor Engine] Launching unified Tor Daemon & Bridge (Ports: 9050 / 9051 / 9052)...
    powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -Command "Start-Process node -ArgumentList '\"%~dp0vpn-daemon.cjs\"' -WindowStyle Hidden"
    timeout /t 2 >nul
    echo [Tor Engine] Daemon & Control Bridge are running in the background!
    echo [Tor Engine] SOCKS5 Proxy : 127.0.0.1:9050
    echo [Tor Engine] Control Port : 127.0.0.1:9051
    echo [Tor Engine] Status Bridge: http://127.0.0.1:9052
    echo.
    echo You can now connect in your browser tab.
    exit /b 0
)

echo [Tor Engine] Node.js not detected in PATH. Starting tor.exe directly via PowerShell...
powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0start-tor.ps1"
echo [Tor Engine] Tor daemon launched on 127.0.0.1:9050.
