#!/usr/bin/env pwsh
# Pack openclaw as .tgz and optionally install it globally.
#
# Usage:
#   .\scripts\windows\Pack-Install.ps1                # Interactive (prompts for install/delete)
#   .\scripts\windows\Pack-Install.ps1 -PackOnly      # Build + pack, skip install
#   .\scripts\windows\Pack-Install.ps1 -Install        # Build + pack + install (no prompt)
#   .\scripts\windows\Pack-Install.ps1 -Install -Clean # Build + pack + install + delete tgz
#   .\scripts\windows\Pack-Install.ps1 -SkipBuild      # Pack only (assumes already built)

param(
    [switch]$PackOnly,   # Build + pack only, skip install
    [switch]$Install,    # Build + pack + install without prompting
    [switch]$Clean,      # Delete tgz after install (requires -Install)
    [switch]$SkipBuild   # Skip build steps, pack only
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
Push-Location $root

try {
    # Ensure Git Bash's node is reachable
    $gitBashBin = "C:\Program Files\Git\usr\bin"
    if ($env:PATH -notlike "*$gitBashBin*") {
        $env:PATH = "$gitBashBin;$env:PATH"
    }

    # Build
    if (-not $SkipBuild) {
        Write-Host "`n=== Building... ===" -ForegroundColor Cyan
        pnpm build
        if ($LASTEXITCODE -ne 0) { throw "pnpm build failed" }

        pnpm ui:build
        if ($LASTEXITCODE -ne 0) { throw "pnpm ui:build failed" }
    } else {
        Write-Host "`n=== Skipping build (SkipBuild) ===" -ForegroundColor Yellow
    }

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

    # Determine install behavior
    if ($PackOnly) {
        Write-Host "Pack only mode. Package at: $tgz" -ForegroundColor Gray
        Write-Host "You can install later with: npm install -g $tgz" -ForegroundColor Gray
        return
    }

    $shouldInstall = $false
    if ($Install) {
        $shouldInstall = $true
    } else {
        $installAnswer = Read-Host "`nInstall globally? (Y/n)"
        if ($installAnswer -notmatch '^[nN]') {
            $shouldInstall = $true
        }
    }

    if (-not $shouldInstall) {
        Write-Host "Skipped install. Package at: $tgz" -ForegroundColor Gray
        Write-Host "You can install later with: npm install -g $tgz" -ForegroundColor Gray
        return
    }

    Write-Host "`n=== Installing globally... ===" -ForegroundColor Cyan
    npm install -g $tgz
    if ($LASTEXITCODE -ne 0) { throw "npm install -g failed" }
    Write-Host "Installed successfully!" -ForegroundColor Green

    # Determine delete behavior
    $shouldDelete = $false
    if ($Clean) {
        $shouldDelete = $true
    } elseif (-not $Install) {
        $deleteAnswer = Read-Host "`nDelete $($pkg.name)-$($pkg.version).tgz? (y/N)"
        if ($deleteAnswer -match '^[yY]') {
            $shouldDelete = $true
        }
    }

    if ($shouldDelete) {
        Remove-Item $tgz -Force
        Write-Host "Deleted." -ForegroundColor Yellow
    } else {
        Write-Host "Kept at: $tgz" -ForegroundColor Gray
        Write-Host "You can reinstall later with: npm install -g $tgz" -ForegroundColor Gray
    }
}
finally {
    Pop-Location
}
