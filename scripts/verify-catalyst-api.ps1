# Verify Catalyst pashumitra_api is deployed and returns CORS headers.
param(
  [string]$BaseUrl = "https://project-rainfall-60075686570.development.catalystserverless.in/server/pashumitra_api",
  [string]$Origin = "https://dairy-mitr-znhzndph.onslate.in"
)

$ErrorActionPreference = "Continue"
Write-Host "Checking $BaseUrl ..." -ForegroundColor Cyan

$root = curl.exe -s -i "$BaseUrl/"
Write-Host "`n--- GET / ---"
Write-Host ($root -split "`n" | Select-Object -First 15)

$preflight = curl.exe -s -i -X OPTIONS "$BaseUrl/transcribe" `
  -H "Origin: $Origin" `
  -H "Access-Control-Request-Method: POST" `
  -H "Access-Control-Request-Headers: content-type"
Write-Host "`n--- OPTIONS /transcribe ---"
Write-Host ($preflight -split "`n" | Select-Object -First 20)

if ($root -match '"ok"\s*:\s*true') {
  Write-Host "`nOK: Function is deployed." -ForegroundColor Green
} elseif ($root -match "The domain is not found|Invalid API URL") {
  Write-Host "`nFAIL: Function URL blocked (404 - domain not found)." -ForegroundColor Red
  Write-Host "Check the URL TLD from 'catalyst deploy' output (India DC uses .catalystserverless.in, not .com)." -ForegroundColor Yellow
  Write-Host "If API Gateway is enabled: cd catalyst && catalyst apig:disable" -ForegroundColor Yellow
  Write-Host "Or: Console -> Cloud Scale -> API Gateway -> Disable" -ForegroundColor Yellow
  Write-Host "Then run: npm run verify:catalyst-api" -ForegroundColor Yellow
} else {
  Write-Host "`nFAIL: Function not deployed (expected JSON with ok:true, got 404 or error)." -ForegroundColor Red
  Write-Host "Run: npm run build:catalyst-api && cd catalyst && catalyst deploy --only functions" -ForegroundColor Yellow
}

if ($preflight -match "Access-Control-Allow-Origin") {
  Write-Host "OK: CORS header present on preflight." -ForegroundColor Green
  if ($preflight -match "Access-Control-Allow-Origin:[^\r\n]*,\s*\*") {
    Write-Host "WARN: Duplicate Access-Control-Allow-Origin (gateway + function). Redeploy function after CORS fix." -ForegroundColor Yellow
  }
} else {
  Write-Host "FAIL: No Access-Control-Allow-Origin on preflight." -ForegroundColor Red
  Write-Host "Catalyst Console -> Cloud Scale -> Authentication -> Whitelisting -> Add Domain:" -ForegroundColor Yellow
  Write-Host "  dairy-mitr-znhzndph.onslate.in  (enable CORS)" -ForegroundColor Yellow
  Write-Host "Do NOT add catalystserverless.in/.com - only your Slate origin domain." -ForegroundColor Yellow
}
