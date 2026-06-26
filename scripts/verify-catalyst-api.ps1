# Verify Catalyst pashumitra_api is deployed and returns CORS headers.
param(
  [string]$BaseUrl = "https://project-rainfall-60075686570.development.catalystserverless.com/server/pashumitra_api",
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
} else {
  Write-Host "`nFAIL: Function not deployed (expected JSON with ok:true, got 404 or error)." -ForegroundColor Red
  Write-Host "Run: npm run build:catalyst-api && cd catalyst && catalyst deploy --only functions" -ForegroundColor Yellow
}

if ($preflight -match "Access-Control-Allow-Origin") {
  Write-Host "OK: CORS header present on preflight." -ForegroundColor Green
} else {
  Write-Host "FAIL: No Access-Control-Allow-Origin on preflight." -ForegroundColor Red
  Write-Host "Catalyst Console -> Cloud Scale -> Authentication -> Whitelisting -> Add Domain:" -ForegroundColor Yellow
  Write-Host "  dairy-mitr-znhzndph.onslate.in  (enable CORS)" -ForegroundColor Yellow
  Write-Host "Also add (same project, cross-domain):" -ForegroundColor Yellow
  Write-Host "  project-rainfall-60075686570.development.catalystserverless.com  (enable CORS)" -ForegroundColor Yellow
}
