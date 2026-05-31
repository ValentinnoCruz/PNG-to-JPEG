# fetch-tools.ps1
# Downloads portable ExifTool into tools/ so electron-builder bundles it
# into the installer. Idempotent: skips if the binary already exists.
# Pass -Force to redownload.
#
# Note: ImageMagick is NOT bundled. The portable .7z release is silently
# stalled by some corporate AV/EDR products on first execution, which would
# break the app in deployments that need bundling the most. Coworkers install
# it via the official signed installer from imagemagick.org (linked from the
# in-app Setup modal). ExifTool's portable build is safe to bundle.

[CmdletBinding()]
param(
    [string]$ExifToolVersion = "",   # auto-detect latest if empty
    [switch]$Force
)

$ErrorActionPreference = 'Stop'
$root      = Split-Path -Parent $PSScriptRoot
$toolsDir  = Join-Path $root 'tools'
$etDir     = Join-Path $toolsDir 'exiftool'
$tmpRoot   = Join-Path $env:TEMP "png2jpeg-fetch-tools"

if (-not (Test-Path $toolsDir)) { New-Item -ItemType Directory -Path $toolsDir | Out-Null }
if (-not (Test-Path $tmpRoot))  { New-Item -ItemType Directory -Path $tmpRoot | Out-Null }

function Download-File {
    param([string]$Url, [string]$OutPath)
    Write-Host "  downloading $Url" -ForegroundColor Cyan
    $pp = $ProgressPreference; $ProgressPreference = 'SilentlyContinue'
    try { Invoke-WebRequest -Uri $Url -OutFile $OutPath -UseBasicParsing }
    finally { $ProgressPreference = $pp }
}

function Get-LatestExifToolTag {
    try {
        $r = Invoke-RestMethod "https://api.github.com/repos/exiftool/exiftool/tags?per_page=1" -UseBasicParsing
        return $r[0].name
    } catch {
        Write-Warning "GitHub API failed for ExifTool tags: $($_.Exception.Message). Falling back to 13.59."
        return "13.59"
    }
}

$exifExe = Join-Path $etDir 'exiftool.exe'
if ((Test-Path $exifExe) -and -not $Force) {
    Write-Host "[ExifTool] already present at $exifExe (use -Force to redownload)" -ForegroundColor Green
} else {
    if ([string]::IsNullOrWhiteSpace($ExifToolVersion)) {
        $ExifToolVersion = Get-LatestExifToolTag
    }
    Write-Host "[ExifTool] target version: $ExifToolVersion" -ForegroundColor Yellow

    $url     = "https://exiftool.org/exiftool-$($ExifToolVersion)_64.zip"
    $zipPath = Join-Path $tmpRoot "exiftool-$ExifToolVersion.zip"
    Download-File -Url $url -OutPath $zipPath

    $stage = Join-Path $tmpRoot "exiftool-extract"
    if (Test-Path $stage) { Remove-Item -Recurse -Force $stage }
    Expand-Archive -Path $zipPath -DestinationPath $stage -Force

    # If the zip wraps everything in a single subfolder, flatten.
    $rootHasFiles = @(Get-ChildItem $stage -File).Count -gt 0
    if (-not $rootHasFiles) {
        $inner = Get-ChildItem $stage -Directory | Select-Object -First 1
        if ($inner) { $stage = $inner.FullName }
    }

    $kExe = Get-ChildItem $stage -Filter 'exiftool(-k).exe' -Recurse | Select-Object -First 1
    if ($kExe) {
        $renamed = Join-Path $kExe.DirectoryName 'exiftool.exe'
        if (Test-Path $renamed) { Remove-Item $renamed -Force }
        Rename-Item -Path $kExe.FullName -NewName 'exiftool.exe'
    }

    if (Test-Path $etDir) { Remove-Item -Recurse -Force $etDir }
    New-Item -ItemType Directory -Path $etDir | Out-Null
    Copy-Item -Path (Join-Path $stage '*') -Destination $etDir -Recurse -Force

    # Strip Mark-of-the-Web zone tags so Windows doesn't sandbox the exe.
    Get-ChildItem $etDir -Recurse -File | ForEach-Object { Unblock-File -Path $_.FullName -ErrorAction SilentlyContinue }

    if (-not (Test-Path $exifExe)) {
        throw "ExifTool extraction did not produce exiftool.exe at $exifExe"
    }
    Write-Host "[ExifTool] installed -> $exifExe" -ForegroundColor Green
}

Write-Host ""
Write-Host "Done. Verify with:" -ForegroundColor Yellow
Write-Host "  & '$exifExe' -ver"
