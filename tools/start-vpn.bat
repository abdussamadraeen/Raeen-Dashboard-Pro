@echo off
cd /d "%~dp0"
echo ===================================================
echo   Workspace - Privacy & Proxy Engine  
echo ===================================================
echo [1/2] Launching Tor daemon and Controller Bridge...
start "Privacy VPN Engine" /b node "%~dp0vpn-daemon.cjs"
timeout /t 2 /nobreak >NUL
powershell -Command "try { $r = Invoke-RestMethod -Uri 'http://127.0.0.1:9052/status' -TimeoutSec 3; Write-Host ('[VPN Engine] Engine Active! Socks5: 127.0.0.1:9050 | Bootstrapped: ' + $r.bootstrapped + ' (' + $r.bootstrapProgress + '%%)') -ForegroundColor Green } catch { Write-Host '[VPN Engine] Engine starting up in background...' -ForegroundColor Yellow }"
echo ===================================================
echo Ready! You can now connect from your Dashboard.
echo ===================================================
