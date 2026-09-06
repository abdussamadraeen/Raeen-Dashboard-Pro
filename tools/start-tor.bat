@echo off
tasklist /FI "IMAGENAME eq tor.exe" 2>NUL | find /I /N "tor.exe">NUL
if "%ERRORLEVEL%"=="0" (
    echo Tor is already running.
) else (
    echo Starting Tor background daemon...
    wscript.exe "C:\Workspace\Extension\google\tools\run-tor-daemon.vbs"
    timeout /t 3 /nobreak >NUL
    echo Tor daemon launched on 127.0.0.1:9050.
)
