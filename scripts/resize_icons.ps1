Add-Type -AssemblyName System.Drawing

$src = "C:\Users\AbdussamadRaeen\.gemini\antigravity-ide\brain\dec477dc-4c64-4e3c-9213-5962e0b45418\media__1780468672980.jpg"
$img = [System.Drawing.Image]::FromFile($src)

$sizes = @(16, 32, 48, 96, 128)

foreach ($size in $sizes) {
    # Generate public/icon/<size>.png
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($img, 0, 0, $size, $size)
    
    $outPath = "c:\AbdussamadRaeen\Extension\google\public\icon\$size.png"
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generated $outPath"
}

# Generate public/icons/icon16.png, icon48.png, icon128.png
$extraSizes = @(16, 48, 128)
foreach ($size in $extraSizes) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.DrawImage($img, 0, 0, $size, $size)
    
    $outPath = "c:\AbdussamadRaeen\Extension\google\public\icons\icon$size.png"
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    Write-Host "Generated $outPath"
}

$img.Dispose()
