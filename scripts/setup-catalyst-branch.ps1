# Setup Catalyst + Sarvam branch

Write-Host "Setting up Catalyst + Sarvam (frontend env only)..."

$root = Split-Path -Parent $PSScriptRoot
$envExample = Join-Path $root ".env.example"
$envLocal = Join-Path $root ".env.local"

if (-not (Test-Path $envLocal)) {
  Copy-Item $envExample $envLocal
  Write-Host "Created .env.local from .env.example"
} else {
  Write-Host ".env.local already exists"
}

Write-Host @"

Next steps:
  1. Set VITE_CATALYST_API_URL in .env.local
  2. npm run build:catalyst-api
  3. Set SARVAM_API_KEY in catalyst/functions/pashumitra_api/.env
  4. npm run dev:catalyst

Deploy: see docs/CATALYST_DEPLOY.md
"@
