@echo off
cd /d "%~dp0"
echo ===================================================
echo   Raeen Workspace - Universe VPN ^& Privacy Engine  
echo ===================================================
echo [1/2] Launching Tor daemon and Controller Bridge...
start "Raeen VPN Engine" /b node "%~dp0vpn-daemon.cjs"
timeout /t 2 /nobreak >NUL
powershell -Command "try { $r = Invoke-RestMethod -Uri 'http://127.0.0.1:9052/status' -TimeoutSec 3; Write-Host ('[Raeen VPN] Engine Active! Socks5: 127.0.0.1:9050 | Bootstrapped: ' + $r.bootstrapped + ' (' + $r.bootstrapProgress + '%%)') -ForegroundColor Green } catch { Write-Host '[Raeen VPN] Engine starting up in background...' -ForegroundColor Yellow }"
echo ===================================================
echo Ready! You can now connect from your Raeen Dashboard.
echo ===================================================
