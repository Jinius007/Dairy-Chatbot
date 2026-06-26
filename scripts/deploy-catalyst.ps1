# Deploy Catalyst API + configure Slate (run in YOUR terminal — needs Zoho login)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host "Building API bundle..." -ForegroundColor Cyan
npm run build:catalyst-api

Set-Location (Join-Path $Root "catalyst")

if (-not (Test-Path "catalyst.json") -or (Get-Content "catalyst.json" -Raw).Trim() -eq "{}") {
  Write-Host "ERROR: catalyst/catalyst.json must list pashumitra_api under functions.targets" -ForegroundColor Red
  exit 1
}

if (-not (Test-Path ".catalystrc")) {
  Write-Host "`nFirst time: catalyst login && catalyst init" -ForegroundColor Yellow
  catalyst login
  catalyst init
}

Write-Host "`nDeploying pashumitra_api..." -ForegroundColor Cyan
catalyst deploy --only functions

Write-Host @"

NEXT STEPS:
1. Catalyst Console -> Functions -> pashumitra_api -> Environment:
   SARVAM_API_KEY=<your key>
   SARVAM_CHAT_MODEL=sarvam-30b
   SARVAM_STT_MODEL=saaras:v3

2. Copy function URL from deploy output (ends with /server/pashumitra_api)

3. Catalyst Console -> Slate -> Environment:
   VITE_CATALYST_API_URL=<function URL from step 2>

4. Redeploy Slate -> https://dairy-mitr-znhzndph.onslate.in

"@ -ForegroundColor Green
