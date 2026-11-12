param([Parameter(Mandatory=$true)][string]$SourceDirectory)
$ErrorActionPreference = 'Stop'
$source = (Resolve-Path -LiteralPath $SourceDirectory).Path
$project = Split-Path $PSScriptRoot -Parent
$target = Join-Path $project 'source-snapshot'
if (!(Test-Path -LiteralPath (Join-Path $source 'browser-extension\manifest.json'))) { throw 'Not a drawing bridge source directory.' }
if (Test-Path -LiteralPath $target) { throw 'source-snapshot already exists; review it before importing another copy.' }
$utf8 = New-Object System.Text.UTF8Encoding($false)
$items = @()
foreach ($folder in @('browser-extension','mcp','skills','.codex-plugin')) {
  $folderPath = Join-Path $source $folder
  if (Test-Path -LiteralPath $folderPath) { $items += Get-ChildItem -LiteralPath $folderPath -Recurse -File -Force }
}
foreach ($name in @('.mcp.json','README.md','CONFIGURATION-WORKFLOW.md','install.ps1','install.cmd','uninstall.ps1','build.ps1')) {
  $file = Join-Path $source $name
  if (Test-Path -LiteralPath $file) { $items += Get-Item -LiteralPath $file }
}
$records = @()
foreach ($item in $items) {
  if ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) { throw 'Linked files must be reviewed before import.' }
  if ($item.Extension -notin @('.js','.mjs','.json','.md','.ps1','.cmd','.yaml','.yml','.html')) { continue }
  $relative = $item.FullName.Substring($source.Length).TrimStart([char]'\')
  if ($relative -match '(?i)(^|\\)(node_modules|runtime|\.runtime|dist)(\\|$)|(^|\\)(token|connection\.json)$') { continue }
  $destination = Join-Path $target $relative
  New-Item -ItemType Directory -Path (Split-Path $destination -Parent) -Force | Out-Null
  Copy-Item -LiteralPath $item.FullName -Destination $destination
  $records += [ordered]@{ path=$relative.Replace('\','/'); sha256=(Get-FileHash -LiteralPath $destination -Algorithm SHA256).Hash.ToLowerInvariant() }
}
[System.IO.File]::WriteAllText((Join-Path $target 'import-manifest.json'), ($records | ConvertTo-Json -Depth 5), $utf8)
Write-Host ('Copied ' + $records.Count + ' source files. Review for customer data and machine-specific paths before committing.')
Write-Host 'No GitHub upload, browser registration or customer configuration operation was performed.'

