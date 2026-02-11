#!/usr/bin/env pwsh
# Pack openclaw as .tgz and install it globally.
# Usage: .\scripts\pack-install.ps1

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Push-Location $root

try {
    # Ensure Git Bash's node is reachable
    $gitBashBin = "C:\Program Files\Git\usr\bin"
    if ($env:PATH -notlike "*$gitBashBin*") {
        $env:PATH = "$gitBashBin;$env:PATH"
    }

    # Build
    Write-Host "`n=== Building... ===" -ForegroundColor Cyan
    pnpm build
    if ($LASTEXITCODE -ne 0) { throw "pnpm build failed" }

    pnpm ui:build
    if ($LASTEXITCODE -ne 0) { throw "pnpm ui:build failed" }

    # Pack (skip prepack since we already built)
    Write-Host "`n=== Packing... ===" -ForegroundColor Cyan
    $env:npm_config_ignore_scripts = "true"
    pnpm pack
    $env:npm_config_ignore_scripts = $null
    if ($LASTEXITCODE -ne 0) { throw "pnpm pack failed" }

    # Find the generated .tgz
    $pkg = Get-Content "$root\package.json" | ConvertFrom-Json
    $tgz = Join-Path $root "$($pkg.name)-$($pkg.version).tgz"
    if (-not (Test-Path $tgz)) {
        throw "Expected $tgz but file not found"
    }
    Write-Host "`nPackage created: $tgz" -ForegroundColor Green

    # Ask whether to install
    $installAnswer = Read-Host "`nInstall globally? (Y/n)"
    if ($installAnswer -match '^[nN]') {
        Write-Host "Skipped install. Package at: $tgz" -ForegroundColor Gray
        Write-Host "You can install later with: npm install -g $tgz" -ForegroundColor Gray
    } else {
        Write-Host "`n=== Installing globally... ===" -ForegroundColor Cyan
        npm install -g $tgz
        if ($LASTEXITCODE -ne 0) { throw "npm install -g failed" }
        Write-Host "Installed successfully!" -ForegroundColor Green

        # Ask whether to delete the .tgz
        $deleteAnswer = Read-Host "`nDelete $($pkg.name)-$($pkg.version).tgz? (y/N)"
        if ($deleteAnswer -match '^[yY]') {
            Remove-Item $tgz -Force
            Write-Host "Deleted." -ForegroundColor Yellow
        } else {
            Write-Host "Kept at: $tgz" -ForegroundColor Gray
            Write-Host "You can reinstall later with: npm install -g $tgz" -ForegroundColor Gray
        }
    }
}
finally {
    Pop-Location
}
