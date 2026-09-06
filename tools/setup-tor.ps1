$url = "https://archive.torproject.org/tor-package-archive/torbrowser/15.0.21/tor-expert-bundle-windows-x86_64-15.0.21.tar.gz"
$torDir = "C:\Workspace\Extension\google\tools\tor"

if (-not (Test-Path $torDir)) {
    New-Item -ItemType Directory -Path $torDir -Force | Out-Null
}

$tarFile = Join-Path $torDir "tor.tar.gz"

if (-not (Test-Path (Join-Path $torDir "tor\tor.exe"))) {
    Write-Host "Downloading Tor Expert Bundle from TorProject..."
    curl.exe -L -o $tarFile $url
    if (Test-Path $tarFile) {
        Write-Host "Extracting Tor..."
        tar -xzf $tarFile -C $torDir
        Remove-Item $tarFile -Force -ErrorAction SilentlyContinue
    }
}

$torExe = Join-Path $torDir "tor\tor.exe"
if (Test-Path $torExe) {
    Write-Host "Tor successfully installed at $torExe"
    $running = Get-Process -Name "tor" -ErrorAction SilentlyContinue
    if (-not $running) {
        Write-Host "Starting Tor background daemon on 127.0.0.1:9050..."
        Start-Process -FilePath $torExe -ArgumentList "--SocksPort 9050" -WindowStyle Hidden
        Start-Sleep -Seconds 3
    }
    $check = Get-Process -Name "tor" -ErrorAction SilentlyContinue
    if ($check) {
        Write-Host "Tor daemon is RUNNING (PID: $($check.Id)) on 127.0.0.1:9050!"
    } else {
        Write-Host "Tor failed to start."
    }
} else {
    Write-Host "Tor executable not found."
}
