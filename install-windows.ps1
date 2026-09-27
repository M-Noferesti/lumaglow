# Run this file from PowerShell to install the unsigned CEP development extension.
$ErrorActionPreference = 'Stop'
$manifestPath = Join-Path $PSScriptRoot 'CSXS\manifest.xml'
if (-not (Test-Path -LiteralPath $manifestPath)) { throw 'Run this script from the extracted LumaGlow folder.' }
$extensionsPath = Join-Path $env:APPDATA 'Adobe\CEP\extensions'
$targetPath = Join-Path $extensionsPath 'com.codex.lumaglow.cep'
New-Item -ItemType Directory -Path $targetPath -Force | Out-Null
Get-ChildItem -LiteralPath $PSScriptRoot -Force | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $targetPath -Recurse -Force
}
$registryPath = 'HKCU:\Software\Adobe\CSXS.12'
New-Item -Path $registryPath -Force | Out-Null
New-ItemProperty -Path $registryPath -Name 'PlayerDebugMode' -PropertyType String -Value '1' -Force | Out-Null
Write-Output "Installed LumaGlow to $targetPath"
Write-Output 'Restart Photoshop, then open Window > Extensions (Legacy) > LumaGlow.'
