param([string]$OutputDirectory)
$ErrorActionPreference = 'Stop'
if (!$OutputDirectory) { $OutputDirectory = Join-Path $PSScriptRoot 'dist' }
$output = [System.IO.Path]::GetFullPath($OutputDirectory)
$version = (Get-Content -LiteralPath (Join-Path $PSScriptRoot '.codex-plugin\plugin.json') -Raw -Encoding UTF8 | ConvertFrom-Json).version
$name = "construction-drawing-bridge-$version-windows"
$package = Join-Path $output $name
if (Test-Path -LiteralPath $package) { throw "Build directory already exists: $package. Choose a new output directory." }
New-Item -ItemType Directory -Path $package -Force | Out-Null
# Prepare files without changing browser registration on the build machine.
& (Join-Path $PSScriptRoot 'install.ps1') -InstallDirectory $package -PrepareOnly
$utf8 = New-Object System.Text.UTF8Encoding($false)
# Distributable configuration uses plugin-relative paths, never the builder's profile.
$portable = @{ mcpServers = @{ construction_drawing = @{
  type = 'stdio'; command = '${PLUGIN_ROOT}/runtime/node.exe'
  args = @('${PLUGIN_ROOT}/mcp/native-server.mjs', '--stdio')
} } }
[System.IO.File]::WriteAllText((Join-Path $package '.mcp.json'), ($portable | ConvertTo-Json -Depth 8), $utf8)
foreach ($generated in @('mcp-client.json', 'mcp-client.toml', 'native-host.json', 'native-host.cmd')) {
  Remove-Item -LiteralPath (Join-Path $package $generated) -Force
}
Remove-Item -LiteralPath (Join-Path $package '.codex\config.toml') -Force
Copy-Item -LiteralPath (Join-Path $PSScriptRoot 'build.ps1') -Destination $package -Force
$records = Get-ChildItem -LiteralPath $package -Recurse -File -Force | Sort-Object FullName | ForEach-Object {
  $relative = $_.FullName.Substring($package.Length + 1).Replace('\', '/')
  [ordered]@{ path = $relative; bytes = $_.Length; sha256 = (Get-FileHash -LiteralPath $_.FullName -Algorithm SHA256).Hash.ToLowerInvariant() }
}
[System.IO.File]::WriteAllText((Join-Path $package 'files.sha256.json'), ($records | ConvertTo-Json -Depth 5), $utf8)
Add-Type -AssemblyName System.IO.Compression.FileSystem
$archive = Join-Path $output ($name + '.zip')
if (Test-Path -LiteralPath $archive) { throw "Archive already exists: $archive" }
[System.IO.Compression.ZipFile]::CreateFromDirectory($package, $archive, [System.IO.Compression.CompressionLevel]::Optimal, $true)
Write-Host ('Package: ' + $archive)
Write-Host ('SHA256: ' + (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash)

