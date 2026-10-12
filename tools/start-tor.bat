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
    timeout /t 2 /nobreak >nul
    echo.
    echo [Tor Engine] Checking bridge status...
    powershell.exe -ExecutionPolicy Bypass -Command "try { $r = Invoke-RestMethod -Uri 'http://127.0.0.1:9052/status' -TimeoutSec 3; Write-Host ('[Tor Engine] Status: ' + ($r.running ? 'ONLINE (100% Ready)' : 'Bootstrapping...')) -ForegroundColor Green } catch { Write-Host '[Tor Engine] Starting in background...' -ForegroundColor Yellow }"
    echo.
    echo [Tor Engine] SOCKS5 Proxy : 127.0.0.1:9050
    echo [Tor Engine] Control Port : 127.0.0.1:9051
    echo [Tor Engine] Status Bridge: http://127.0.0.1:9052
    echo.
    echo [Tor Engine] SUCCESS! Tor is now active.
    echo Open your browser new tab, select Tor Onion Route, and click Connect!
    echo.
    timeout /t 5
    exit /b 0
)

echo [Tor Engine] Node.js not detected in PATH. Starting tor.exe directly via PowerShell...
powershell.exe -ExecutionPolicy Bypass -WindowStyle Hidden -File "%~dp0start-tor.ps1"
echo [Tor Engine] Tor daemon launched on 127.0.0.1:9050.
timeout /t 5

