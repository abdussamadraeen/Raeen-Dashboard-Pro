$dataDir = "C:\Workspace\Extension\google\tools\tor\data-dir"
if (-not (Test-Path $dataDir)) {
    New-Item -ItemType Directory -Path $dataDir -Force | Out-Null
}

$running = Get-Process -Name "tor" -ErrorAction SilentlyContinue
if ($running) {
    Stop-Process -Name "tor" -Force -ErrorAction SilentlyContinue
    Start-Sleep -Milliseconds 500
}

$torExe = "C:\Workspace\Extension\google\tools\tor\tor\tor.exe"
$torrc = "C:\Workspace\Extension\google\tools\tor\torrc"

Write-Host "Launching Tor..."
$proc = Start-Process -FilePath $torExe -ArgumentList "-f `"$torrc`"" -PassThru -WindowStyle Hidden
Start-Sleep -Seconds 6

$check = Get-Process -Name "tor" -ErrorAction SilentlyContinue
if ($check) {
    Write-Host "SUCCESS: Tor is running with PID $($check.Id)!"
} else {
    Write-Host "ERROR: Tor failed to keep running. Checking log..."
}
