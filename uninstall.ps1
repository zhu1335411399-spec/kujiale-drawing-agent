$ErrorActionPreference = 'Stop'
$expected = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot 'native-host.json'))
foreach ($browser in @('Google\Chrome', 'Microsoft\Edge')) {
  $path = "Software\$browser\NativeMessagingHosts\com.kujiale.construction_drawing"
  $key = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey($path)
  if (!$key) { continue }
  try { $registered = $key.GetValue('') } finally { $key.Dispose() }
  if ($registered -eq $expected) { [Microsoft.Win32.Registry]::CurrentUser.DeleteSubKey($path, $false) }
}
Write-Host 'Native host registration removed. Remove the browser extension and MCP entry in their settings.'
Write-Host 'Installation files have been retained.'

