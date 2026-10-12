@echo off
title Raeen Workspace - Enable Tor Background Auto-Start

echo ====================================================================
echo   RAEEN WORKSPACE: ENABLE SILENT BACKGROUND AUTO-START
echo   Tor Engine will start automatically and silently with Windows
echo ====================================================================
echo.

set "STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup"
set "VBS_TARGET=%~dp0start-silent-daemon.vbs"
set "STARTUP_VBS=%STARTUP_DIR%\RaeenTorSilent.vbs"

(
echo Set WshShell = CreateObject("WScript.Shell"^)
echo WshShell.Run "wscript.exe """ ^& "%VBS_TARGET%" ^& """", 0, False
) > "%STARTUP_VBS%"

echo [*] Tor Engine silent startup registered in:
echo     %STARTUP_VBS%
echo.
echo ====================================================================
echo   SUCCESS! Tor Engine will now run silently in background on boot.
echo   You will NEVER have to run a .bat file again!
echo ====================================================================
echo.
timeout /t 5 >nul 2>&1 || ping 127.0.0.1 -n 6 >nul
