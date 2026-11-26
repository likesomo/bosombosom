# docs/print/scene-flow.html -> docs/scene-flow.pdf
# Usage (PowerShell, project root): powershell -ExecutionPolicy Bypass -File docs/print/build-pdf.ps1
# Optional: -Out <path> to write somewhere else.
param([string]$Out = (Join-Path $PSScriptRoot "..\scene-flow.pdf"))

$chrome = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
) | Where-Object { Test-Path $_ } | Select-Object -First 1
if (-not $chrome) { Write-Error "Chrome or Edge not found."; exit 1 }

$html = (Resolve-Path (Join-Path $PSScriptRoot "scene-flow.html")).Path
$out  = [System.IO.Path]::GetFullPath($Out)
$url  = "file:///" + ($html -replace '\\', '/')

& $chrome --headless=new --disable-gpu --no-pdf-header-footer --allow-file-access-from-files `
  --virtual-time-budget=15000 "--print-to-pdf=$out" $url 2>$null | Out-Null

if (Test-Path $out) { Write-Host "PDF written: $out" } else { Write-Error "PDF was not created."; exit 1 }
