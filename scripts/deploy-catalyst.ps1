# Deploy Catalyst pashumitra_api — run in YOUR terminal (needs interactive Zoho login)
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host ""
Write-Host "=== Pashu Mitra Catalyst deploy ===" -ForegroundColor Cyan

# 1. Build bundle
Write-Host ""
Write-Host "[1/5] Building API bundle..." -ForegroundColor Cyan
npm run build:catalyst-api

# 2. Function dependencies (express + zcatalyst-sdk-node)
Write-Host ""
Write-Host "[2/5] Installing function dependencies..." -ForegroundColor Cyan
Push-Location (Join-Path $Root "catalyst\functions\pashumitra_api")
npm install
Pop-Location

Set-Location (Join-Path $Root "catalyst")

if (-not (Test-Path "catalyst.json") -or (Get-Content "catalyst.json" -Raw).Trim() -eq "{}") {
  Write-Host "ERROR: catalyst/catalyst.json must list pashumitra_api under functions.targets" -ForegroundColor Red
  exit 1
}

# 3. Login check
Write-Host ""
Write-Host "[3/5] Checking Catalyst login..." -ForegroundColor Cyan
$whoami = catalyst whoami 2>&1 | Out-String
if ($whoami -match "Not logged in") {
  Write-Host "Not logged in. Opening browser for Zoho login..." -ForegroundColor Yellow
  catalyst login
  $whoami = catalyst whoami 2>&1 | Out-String
  if ($whoami -match "Not logged in") {
    Write-Host "ERROR: catalyst login failed. Run: cd catalyst; catalyst login" -ForegroundColor Red
    exit 1
  }
}
Write-Host $whoami.Trim()

if (-not (Test-Path ".catalystrc")) {
  Write-Host ""
  Write-Host "No .catalystrc - linking project (pick Project-Rainfall, Development):" -ForegroundColor Yellow
  catalyst init
}

# 4. Deploy
Write-Host ""
Write-Host "[4/5] Deploying pashumitra_api..." -ForegroundColor Cyan
Write-Host "If this is the first deploy, create the function in Console first:" -ForegroundColor Yellow
Write-Host "  Serverless -> Functions -> Create -> Advanced I/O -> Node 20 -> name: pashumitra_api" -ForegroundColor Yellow
catalyst deploy --only functions
if ($LASTEXITCODE -ne 0) {
  Write-Host ""
  Write-Host "Deploy failed. See docs/CATALYST_DEPLOY.md section 'First-time deploy checklist'." -ForegroundColor Red
  exit $LASTEXITCODE
}

# 4b. If URL returns "The domain is not found", API Gateway is likely blocking direct function URLs
Write-Host ""
Write-Host "Checking API Gateway status..." -ForegroundColor Cyan
$apigStatus = catalyst apig:status 2>&1 | Out-String
if ($apigStatus -match "enabled.*true|Enabled|ENABLED") {
  Write-Host "API Gateway is ENABLED - disabling so /server/pashumitra_api URLs work..." -ForegroundColor Yellow
  catalyst apig:disable
  if ($LASTEXITCODE -eq 0) {
    Write-Host "API Gateway disabled. Waiting 5s for propagation..." -ForegroundColor Green
    Start-Sleep -Seconds 5
  } else {
    Write-Host "Could not disable via CLI. In Console: Cloud Scale -> API Gateway -> Disable" -ForegroundColor Yellow
  }
}

# 5. Verify
Write-Host ""
Write-Host "[5/5] Verifying API..." -ForegroundColor Cyan
Set-Location $Root
npm run verify:catalyst-api

Write-Host ""
Write-Host "If verify still shows 404:" -ForegroundColor Green
Write-Host "  (A) Create Advanced I/O function named pashumitra_api in Console, then redeploy" -ForegroundColor Green
Write-Host "  (B) If API Gateway is enabled: disable it or add an API rule for pashumitra_api" -ForegroundColor Green
Write-Host "  (C) Copy the function URL from deploy output or Console -> Functions" -ForegroundColor Green
Write-Host ""
Write-Host "If verify shows no CORS header:" -ForegroundColor Green
Write-Host "  Cloud Scale -> Authentication -> Whitelisting -> Add Domain with CORS ON:" -ForegroundColor Green
Write-Host "    dairy-mitr-znhzndph.onslate.in" -ForegroundColor Green
Write-Host ""
Write-Host "Update Slate VITE_CATALYST_API_URL (India DC uses .in not .com):" -ForegroundColor Green
Write-Host "  https://project-rainfall-60075686570.development.catalystserverless.in/server/pashumitra_api" -ForegroundColor Green
Write-Host ""
Write-Host "Then set SARVAM_API_KEY on the function and VITE_CATALYST_API_URL on Slate." -ForegroundColor Green
