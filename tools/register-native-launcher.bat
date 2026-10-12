@echo off
setlocal enabledelayedexpansion
title Raeen Workspace - One-Click Tor Auto-Launcher Setup

echo ====================================================================
echo   RAEEN WORKSPACE: ONE-CLICK TOR AUTO-LAUNCHER INSTALLER
echo   Enables Chrome to trigger and run the Tor Engine automatically
echo ====================================================================
echo.

node "%~dp0register-native-host.cjs" %1

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [-] Node.js is required to register the native host automatically.
    echo     Please install Node.js or run tools/enable-autostart.bat instead.
)

echo.
timeout /t 5 >nul 2>&1 || ping 127.0.0.1 -n 6 >nul
