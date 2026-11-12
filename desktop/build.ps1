param([Parameter(Mandatory=$true)][string]$TargetDirectory)
$ErrorActionPreference='Stop'
$source=Join-Path $PSScriptRoot 'Manager.cs'
$binary=Join-Path $TargetDirectory 'DrawingBridgeManager.exe'
$stamp=Join-Path $TargetDirectory 'desktop-source.sha256'
$hash=(Get-FileHash -LiteralPath $source -Algorithm SHA256).Hash
if ((Test-Path -LiteralPath $binary) -and (Test-Path -LiteralPath $stamp) -and (Get-Content -LiteralPath $stamp -Raw).Trim() -eq $hash) { return }
$candidates=@((Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'),(Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe'))
$compiler=$candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (!$compiler) { throw '.NET Framework compiler is unavailable.' }
& $compiler /nologo /target:winexe /codepage:65001 ('/out:'+$binary) /reference:System.Windows.Forms.dll /reference:System.Drawing.dll /reference:System.Web.Extensions.dll $source
if ($LASTEXITCODE -ne 0) { throw 'Desktop manager compilation failed.' }
[System.IO.File]::WriteAllText($stamp,$hash,[System.Text.Encoding]::ASCII)
