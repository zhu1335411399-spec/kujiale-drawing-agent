param(
  [string]$InstallDirectory = (Join-Path $env:LOCALAPPDATA 'KujialeDrawingBridge'),
  [switch]$PrepareOnly
)
$ErrorActionPreference = 'Stop'
$source = $PSScriptRoot
$destination = [System.IO.Path]::GetFullPath($InstallDirectory)
$inPlace = $destination.TrimEnd('\') -eq $source.TrimEnd('\')
$bundledNode = Join-Path $source 'runtime\node.exe'
if (Test-Path -LiteralPath $bundledNode) { $nodeExecutable = $bundledNode }
else { $nodeExecutable = (Get-Command node -ErrorAction Stop).Source }
$nodeVersion = & $nodeExecutable --version
if ($LASTEXITCODE -ne 0 -or $nodeVersion -notmatch '^v(\d+)\.' -or [int]$Matches[1] -lt 20) { throw 'Node.js 20 or newer is required.' }
New-Item -ItemType Directory -Path $destination -Force | Out-Null
# Remove only named files superseded by the native transport during an upgrade.
foreach ($legacy in @('browser-extension\bridge.js', 'mcp\server.mjs', 'mcp\smoke-test.mjs')) {
  $legacyPath = Join-Path $destination $legacy
  if (Test-Path -LiteralPath $legacyPath) { Remove-Item -LiteralPath $legacyPath -Force }
}
foreach ($folder in @('browser-extension', 'mcp', 'skills', '.codex-plugin')) {
  if ($inPlace) { continue }
  $target = Join-Path $destination $folder
  New-Item -ItemType Directory -Path $target -Force | Out-Null
  Get-ChildItem -LiteralPath (Join-Path $source $folder) -Force | Copy-Item -Destination $target -Recurse -Force
}
$runtime = Join-Path $destination 'runtime'
New-Item -ItemType Directory -Path $runtime -Force | Out-Null
$runtimeExecutable = Join-Path $runtime 'node.exe'
if ([System.IO.Path]::GetFullPath($nodeExecutable) -ne $runtimeExecutable) {
  if (!(Test-Path -LiteralPath $runtimeExecutable) -or
      (Get-FileHash -LiteralPath $nodeExecutable).Hash -ne (Get-FileHash -LiteralPath $runtimeExecutable).Hash) {
    Copy-Item -LiteralPath $nodeExecutable -Destination $runtimeExecutable -Force
  }
}
Get-ChildItem -LiteralPath (Split-Path $nodeExecutable) -Filter '*.dll' | ForEach-Object {
  $dllTarget = Join-Path $runtime $_.Name
  if ($_.FullName -ne $dllTarget -and (!(Test-Path -LiteralPath $dllTarget) -or
      (Get-FileHash -LiteralPath $_.FullName).Hash -ne (Get-FileHash -LiteralPath $dllTarget).Hash)) {
    Copy-Item -LiteralPath $_.FullName -Destination $dllTarget -Force
  }
}
foreach ($file in @('install.ps1', 'install.cmd', 'Start.cmd', 'start.ps1', 'welcome-template.html', 'README.md', 'QUICKSTART.md', 'RELEASE-NOTES.md', 'uninstall.ps1', 'CONFIGURATION-WORKFLOW.md')) {
  if ($inPlace) { continue }
  Copy-Item -LiteralPath (Join-Path $source $file) -Destination $destination -Force
}
if (!$inPlace -and (Test-Path -LiteralPath (Join-Path $source 'runtime\LICENSE'))) {
  Copy-Item -LiteralPath (Join-Path $source 'runtime\LICENSE') -Destination (Join-Path $runtime 'LICENSE') -Force
}
$manifest = Get-Content -Raw -Encoding UTF8 (Join-Path $destination 'browser-extension\manifest.json') | ConvertFrom-Json
$sha = [System.Security.Cryptography.SHA256]::Create()
try { $hash = $sha.ComputeHash([Convert]::FromBase64String($manifest.key)) } finally { $sha.Dispose() }
$extensionId = -join ($hash[0..15] | ForEach-Object { [char](97 + ($_ -shr 4)); [char](97 + ($_ -band 15)) })
$utf8 = New-Object System.Text.UTF8Encoding($false)
$launcher = Join-Path $destination 'native-host.cmd'
[System.IO.File]::WriteAllText($launcher, "@echo off`r`n`"%~dp0runtime\node.exe`" `"%~dp0mcp\native-host.mjs`" %*`r`n", [System.Text.Encoding]::ASCII)
$hostManifest = [ordered]@{
  name = 'com.kujiale.construction_drawing'
  description = 'Construction drawing readonly browser bridge'
  path = $launcher
  type = 'stdio'
  allowed_origins = @("chrome-extension://$extensionId/")
}
$manifestPath = Join-Path $destination 'native-host.json'
[System.IO.File]::WriteAllText($manifestPath, ($hostManifest | ConvertTo-Json -Depth 8), $utf8)
$mcp = @{ mcpServers = @{ construction_drawing = @{
  type = 'stdio'; command = (Join-Path $runtime 'node.exe')
  args = @((Join-Path $destination 'mcp\native-server.mjs'), '--stdio')
} } }
[System.IO.File]::WriteAllText((Join-Path $destination '.mcp.json'), ($mcp | ConvertTo-Json -Depth 8), $utf8)
[System.IO.File]::WriteAllText((Join-Path $destination 'mcp-client.json'), ($mcp | ConvertTo-Json -Depth 8), $utf8)
# Codex configuration is generated explicitly; existing client settings are never overwritten.
$tomlPath = (Join-Path $runtime 'node.exe').Replace('\', '/')
$tomlServer = (Join-Path $destination 'mcp\native-server.mjs').Replace('\', '/')
$tomlContent = "[mcp_servers.construction_drawing]`ncommand = '$tomlPath'`nargs = ['$tomlServer', '--stdio']`n"
[System.IO.File]::WriteAllText((Join-Path $destination 'mcp-client.toml'), $tomlContent, $utf8)
New-Item -ItemType Directory -Path (Join-Path $destination '.codex') -Force | Out-Null
[System.IO.File]::WriteAllText((Join-Path $destination '.codex\config.toml'), $tomlContent, $utf8)
foreach ($clientFolder in @('.agents', '.claude')) {
  $clientSkills = Join-Path $destination ($clientFolder + '\skills')
  New-Item -ItemType Directory -Path $clientSkills -Force | Out-Null
  Get-ChildItem -LiteralPath (Join-Path $destination 'skills') -Directory | Copy-Item -Destination $clientSkills -Recurse -Force
}
if (!$PrepareOnly) {
  foreach ($browser in @('Google\Chrome', 'Microsoft\Edge')) {
    try { $key = [Microsoft.Win32.Registry]::CurrentUser.CreateSubKey("Software\$browser\NativeMessagingHosts\com.kujiale.construction_drawing") }
    catch { throw "Windows denied browser host registration. Run install.cmd directly on this computer. Prepared files remain at: $destination" }
    try { $key.SetValue('', $manifestPath) } finally { $key.Dispose() }
  }
}
Write-Host ('Extension directory: ' + (Join-Path $destination 'browser-extension'))
Write-Host ('Extension ID: ' + $extensionId)
Write-Host ('MCP config: ' + (Join-Path $destination 'mcp-client.json'))
if ($PrepareOnly) { Write-Host 'Prepared only. Browser native host registration was skipped.' }
else { Write-Host 'Native host registered for Chrome and Edge. No pairing code is needed.' }

