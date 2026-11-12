param(
  [string]$InstallDirectory = (Join-Path $env:LOCALAPPDATA 'KujialeDrawingBridge'),
  [switch]$PrepareOnly,
  [switch]$NoOpen
)
$ErrorActionPreference = 'Stop'
$setupArgs = @{ InstallDirectory = $InstallDirectory }
if ($PrepareOnly) { $setupArgs.PrepareOnly = $true }
& (Join-Path $PSScriptRoot 'install.ps1') @setupArgs
$destination = [System.IO.Path]::GetFullPath($InstallDirectory)
$nodePath = Join-Path $destination 'runtime\node.exe'
$result = & $nodePath (Join-Path $destination 'mcp\diagnose.mjs')
if ($LASTEXITCODE -ne 0) { throw 'Local bridge self-check failed.' }
$health = $result | ConvertFrom-Json
$utf8 = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText((Join-Path $destination 'diagnostic.json'), ($health | ConvertTo-Json -Depth 8), $utf8)
$template = Get-Content -LiteralPath (Join-Path $destination 'welcome-template.html') -Raw -Encoding UTF8
$template = $template.Replace('{{DIRECTORY}}', [System.Net.WebUtility]::HtmlEncode($destination))
$template = $template.Replace('{{EXTENSION}}', [System.Net.WebUtility]::HtmlEncode((Join-Path $destination 'browser-extension')))
$template = $template.Replace('{{VERSION}}', [System.Net.WebUtility]::HtmlEncode($health.version))
$template = $template.Replace('{{REGISTRATION}}', $(if ($PrepareOnly) { 'Not registered (test mode)' } else { 'Chrome / Edge registered' }))
[System.IO.File]::WriteAllText((Join-Path $destination 'welcome.html'), $template, $utf8)
Write-Host 'PASS local service and MCP tools. The browser extension and AI client are checked separately.'
if (!$NoOpen) {
  Start-Process -FilePath (Join-Path $destination 'DrawingBridgeManager.exe')

}

