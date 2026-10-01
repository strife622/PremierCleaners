Set-StrictMode -Version Latest

$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$Root = Split-Path -Parent $PSScriptRoot
$SourceDir = Join-Path $Root "assets/photos"
$OutputDir = Join-Path $Root "public/assets/images"
$DocsDir = Join-Path $Root "docs"
$ManifestPath = Join-Path $DocsDir "asset-manifest.generated.json"
$LegacyManifestPath = Join-Path $OutputDir "manifest.json"

New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null
New-Item -ItemType Directory -Force -Path $DocsDir | Out-Null
if (Test-Path -LiteralPath $LegacyManifestPath) {
    Remove-Item -LiteralPath $LegacyManifestPath
}

function Get-JpegCodec {
    [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() |
        Where-Object { $_.MimeType -eq "image/jpeg" } |
        Select-Object -First 1
}

function Get-Orientation {
    param([System.Drawing.Image]$Image)

    if ($Image.PropertyIdList -contains 274) {
        $bytes = $Image.GetPropertyItem(274).Value
        return [BitConverter]::ToUInt16($bytes, 0)
    }

    return 1
}

function New-OrientedBitmap {
    param([string]$Path)

    $source = [System.Drawing.Image]::FromFile($Path)
    try {
        $bitmap = New-Object System.Drawing.Bitmap($source)
        $orientation = Get-Orientation -Image $source

        switch ($orientation) {
            3 { $bitmap.RotateFlip([System.Drawing.RotateFlipType]::Rotate180FlipNone) }
            6 { $bitmap.RotateFlip([System.Drawing.RotateFlipType]::Rotate90FlipNone) }
            8 { $bitmap.RotateFlip([System.Drawing.RotateFlipType]::Rotate270FlipNone) }
        }

        return $bitmap
    }
    finally {
        $source.Dispose()
    }
}

function Save-CoverJpeg {
    param(
        [string]$SourceName,
        [string]$OutputName,
        [int]$TargetWidth,
        [int]$TargetHeight,
        [int]$Quality,
        [double]$PositionX,
        [double]$PositionY,
        [string]$Role,
        [string]$Notes
    )

    $sourcePath = Join-Path $SourceDir $SourceName
    $outputPath = Join-Path $OutputDir $OutputName
    $bitmap = New-OrientedBitmap -Path $sourcePath
    $dest = New-Object System.Drawing.Bitmap($TargetWidth, $TargetHeight, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $graphics = [System.Drawing.Graphics]::FromImage($dest)

    try {
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
        $graphics.Clear([System.Drawing.Color]::White)

        $srcAspect = $bitmap.Width / $bitmap.Height
        $targetAspect = $TargetWidth / $TargetHeight

        if ($srcAspect -gt $targetAspect) {
            $cropHeight = $bitmap.Height
            $cropWidth = [int][Math]::Round($cropHeight * $targetAspect)
            $cropX = [int][Math]::Round(($bitmap.Width - $cropWidth) * $PositionX)
            $cropY = 0
        }
        else {
            $cropWidth = $bitmap.Width
            $cropHeight = [int][Math]::Round($cropWidth / $targetAspect)
            $cropX = 0
            $cropY = [int][Math]::Round(($bitmap.Height - $cropHeight) * $PositionY)
        }

        $srcRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $cropWidth, $cropHeight)
        $dstRect = New-Object System.Drawing.Rectangle(0, 0, $TargetWidth, $TargetHeight)
        $graphics.DrawImage($bitmap, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

        $codec = Get-JpegCodec
        $encoder = [System.Drawing.Imaging.Encoder]::Quality
        $params = New-Object System.Drawing.Imaging.EncoderParameters(1)
        $params.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter($encoder, [int64]$Quality)
        $dest.Save($outputPath, $codec, $params)

        $saved = [System.Drawing.Image]::FromFile($outputPath)
        try {
            return [PSCustomObject]@{
                file = "assets/images/$OutputName"
                source = "assets/photos/$SourceName"
                role = $Role
                width = $TargetWidth
                height = $TargetHeight
                bytes = (Get-Item -LiteralPath $outputPath).Length
                sha256 = (Get-FileHash -LiteralPath $outputPath -Algorithm SHA256).Hash
                metadataPropertyCount = $saved.PropertyIdList.Count
                crop = @{
                    x = $cropX
                    y = $cropY
                    width = $cropWidth
                    height = $cropHeight
                    sourceOrientedWidth = $bitmap.Width
                    sourceOrientedHeight = $bitmap.Height
                }
                notes = $Notes
            }
        }
        finally {
            $saved.Dispose()
        }
    }
    finally {
        $graphics.Dispose()
        $dest.Dispose()
        $bitmap.Dispose()
    }
}

$derivatives = @(
    @{ SourceName = "CleanedHallway.jpg"; OutputName = "hallway-portrait-720.jpg"; TargetWidth = 720; TargetHeight = 900; Quality = 76; PositionX = 0.50; PositionY = 0.42; Role = "Home hero facility image"; Notes = "Orientation normalized from EXIF. Cropped for premium commercial hallway context with no visible client identity." },
    @{ SourceName = "CleanedHallway.jpg"; OutputName = "hallway-portrait-1200.jpg"; TargetWidth = 1200; TargetHeight = 1500; Quality = 74; PositionX = 0.50; PositionY = 0.42; Role = "Home hero facility image"; Notes = "Large responsive hero derivative; original preserved outside public." },
    @{ SourceName = "Cleaningelevatorhandles.jpg"; OutputName = "elevator-detail-540.jpg"; TargetWidth = 540; TargetHeight = 720; Quality = 78; PositionX = 0.50; PositionY = 0.54; Role = "Work-detail image"; Notes = "Real handrail cleaning and Premier shirt; worker not identified as Donald." },
    @{ SourceName = "Cleaningelevatorhandles.jpg"; OutputName = "elevator-detail-900.jpg"; TargetWidth = 900; TargetHeight = 1200; Quality = 76; PositionX = 0.50; PositionY = 0.54; Role = "Work-detail image"; Notes = "Responsive larger derivative; no third-party signage visible." },
    @{ SourceName = "CleanedDentistArea.jpg"; OutputName = "clinical-room-640.jpg"; TargetWidth = 640; TargetHeight = 800; Quality = 76; PositionX = 0.48; PositionY = 0.44; Role = "Professional/clinical facility context"; Notes = "Clinical/dental-style interior context only; no compliance or named-client claim." },
    @{ SourceName = "CleanedDentistArea.jpg"; OutputName = "clinical-room-960.jpg"; TargetWidth = 960; TargetHeight = 1200; Quality = 74; PositionX = 0.48; PositionY = 0.44; Role = "Professional/clinical facility context"; Notes = "Orientation normalized from EXIF; metadata stripped." },
    @{ SourceName = "Floorpolishing.jpg"; OutputName = "floor-care-640.jpg"; TargetWidth = 640; TargetHeight = 800; Quality = 76; PositionX = 0.50; PositionY = 0.50; Role = "Floor care service image"; Notes = "Real floor-care work; worker not identified and no extra service claims implied." },
    @{ SourceName = "Floorpolishing.jpg"; OutputName = "floor-care-960.jpg"; TargetWidth = 960; TargetHeight = 1200; Quality = 74; PositionX = 0.50; PositionY = 0.50; Role = "Floor care service image"; Notes = "Responsive larger derivative; original preserved outside public." }
)

$results = foreach ($item in $derivatives) {
    Save-CoverJpeg @item
}

$manifest = [PSCustomObject]@{
    generatedBy = "tools/build-assets.ps1"
    generatedAtUtc = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ssZ")
    policy = "Derivatives are generated from inspected repository photos only. Originals remain outside public/. Orientation is normalized before export. New JPEG bitmaps are written without EXIF, GPS, IPTC or XMP metadata; an encoding color profile is not required."
    derivatives = $results
}

$manifest | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $ManifestPath -Encoding UTF8

$results | Sort-Object file | Format-Table file, width, height, bytes, metadataPropertyCount
