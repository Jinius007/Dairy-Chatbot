# Deploy Catalyst pashumitra_api — run in YOUR terminal (needs interactive Zoho login)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host "`n=== Pashu Mitra Catalyst deploy ===" -ForegroundColor Cyan

# 1. Build bundle
Write-Host "`n[1/5] Building API bundle..." -ForegroundColor Cyan
npm run build:catalyst-api

# 2. Function dependencies (express + zcatalyst-sdk-node)
Write-Host "`n[2/5] Installing function dependencies..." -ForegroundColor Cyan
Push-Location (Join-Path $Root "catalyst\functions\pashumitra_api")
npm install
Pop-Location

Set-Location (Join-Path $Root "catalyst")

if (-not (Test-Path "catalyst.json") -or (Get-Content "catalyst.json" -Raw).Trim() -eq "{}") {
  Write-Host "ERROR: catalyst/catalyst.json must list pashumitra_api under functions.targets" -ForegroundColor Red
  exit 1
}

# 3. Login check
Write-Host "`n[3/5] Checking Catalyst login..." -ForegroundColor Cyan
$whoami = catalyst whoami 2>&1 | Out-String
if ($whoami -match "Not logged in") {
  Write-Host "Not logged in. Opening browser for Zoho login..." -ForegroundColor Yellow
  catalyst login
  $whoami = catalyst whoami 2>&1 | Out-String
  if ($whoami -match "Not logged in") {
    Write-Host "ERROR: catalyst login failed. Run: cd catalyst && catalyst login" -ForegroundColor Red
    exit 1
  }
}
Write-Host $whoami.Trim()

if (-not (Test-Path ".catalystrc")) {
  Write-Host "`nNo .catalystrc — linking project (pick Project-Rainfall, Development):" -ForegroundColor Yellow
  catalyst init
}

# 4. Deploy
Write-Host "`n[4/5] Deploying pashumitra_api..." -ForegroundColor Cyan
Write-Host "If this is the first deploy, create the function in Console first:" -ForegroundColor Yellow
Write-Host "  Serverless -> Functions -> Create -> Advanced I/O -> Node 20 -> name: pashumitra_api" -ForegroundColor Yellow
catalyst deploy --only functions
if ($LASTEXITCODE -ne 0) {
  Write-Host "`nDeploy failed. See docs/CATALYST_DEPLOY.md section 'First-time deploy checklist'." -ForegroundColor Red
  exit $LASTEXITCODE
}

# 5. Verify
Write-Host "`n[5/5] Verifying API..." -ForegroundColor Cyan
Set-Location $Root
npm run verify:catalyst-api

Write-Host @"

If verify still shows 404:
  A) Function missing in Console -> create Advanced I/O function named pashumitra_api, redeploy
  B) API Gateway enabled -> Cloud Scale -> API Gateway -> disable OR add API rule for pashumitra_api
  C) Wrong URL -> copy URL from deploy output or Console -> Functions -> pashumitra_api

If verify shows no CORS header:
  Cloud Scale -> Authentication -> Whitelisting -> Add Domain (CORS ON):
    - dairy-mitr-znhzndph.onslate.in
    - project-rainfall-60075686570.development.catalystserverless.com

Then set SARVAM_API_KEY on the function and VITE_CATALYST_API_URL on Slate.

"@ -ForegroundColor Green
