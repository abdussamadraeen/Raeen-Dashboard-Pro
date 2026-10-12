@echo off
title Raeen Workspace - Disable Tor Auto-Start

set "STARTUP_VBS=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\RaeenTorSilent.vbs"
if exist "%STARTUP_VBS%" (
    del /f /q "%STARTUP_VBS%"
    echo [*] Silent Tor startup removed from Windows Startup folder.
) else (
    echo [*] Tor silent startup was not active.
)
echo SUCCESS!
timeout /t 3
