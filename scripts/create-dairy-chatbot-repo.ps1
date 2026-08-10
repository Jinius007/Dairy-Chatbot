$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

$credInput = "protocol=https`nhost=github.com`n`n"
$cred = $credInput | git credential fill 2>$null
if (-not ($cred -match "password=(.+)")) {
  Write-Error "Could not read GitHub credentials from git credential manager."
}
$token = ($Matches[1]).Trim()

$headers = @{
  Authorization = "token $token"
  "User-Agent"  = "dairy-chatbot-setup"
}

$body = @{
  name        = "Dairy-Chatbot"
  description = "Bharat Pashudhan AI dairy chatbot with ration advisory"
  private     = $false
} | ConvertTo-Json

try {
  $repo = Invoke-RestMethod -Uri "https://api.github.com/user/repos" -Method Post -Headers $headers -Body $body -ContentType "application/json"
} catch {
  $msg = $_.ErrorDetails.Message
  if ($msg -match "name already exists") {
    Write-Host "Repo already exists, pushing to existing Dairy-Chatbot"
    $user = (Invoke-RestMethod -Uri "https://api.github.com/user" -Headers $headers).login
    $repo = Invoke-RestMethod -Uri "https://api.github.com/repos/$user/Dairy-Chatbot" -Headers $headers
  } else {
    throw
  }
}

Write-Host "Repo URL: $($repo.html_url)"

if (git remote | Select-String -Pattern "^dairy-chatbot$" -Quiet) {
  git remote remove dairy-chatbot
}
git remote add dairy-chatbot $repo.clone_url
git push -u dairy-chatbot HEAD:main
Write-Host "Done: pushed to main on Dairy-Chatbot"
