$ErrorActionPreference = "Stop"

function Test-CommandExists {
  param([string]$Name)

  return $null -ne (Get-Command $Name -ErrorAction SilentlyContinue)
}

function Show-Status {
  param(
    [string]$Label,
    [bool]$Ok,
    [string]$SuccessText,
    [string]$FailText
  )

  if ($Ok) {
    Write-Host "[OK] $Label - $SuccessText" -ForegroundColor Green
  } else {
    Write-Host "[MISSING] $Label - $FailText" -ForegroundColor Yellow
  }
}

$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

Write-Host "Checking new PC setup for Discord bot..." -ForegroundColor Cyan
Write-Host "Project root: $root"
Write-Host ""

$hasNode = Test-CommandExists "node"
$hasNpm = Test-CommandExists "npm"
$hasGit = Test-CommandExists "git"

Show-Status "Node.js" $hasNode "installed" "install Node.js 20 LTS or newer"
Show-Status "npm" $hasNpm "installed" "npm should be installed with Node.js"
Show-Status "Git" $hasGit "installed" "install Git for Windows"

if ($hasNode) {
  Write-Host ("Node version: " + (node -v))
}

if ($hasNpm) {
  Write-Host ("npm version: " + (npm -v))
}

Write-Host ""

$envPath = Join-Path $root ".env"
$envExamplePath = Join-Path $root ".env.example"
$dataPath = Join-Path $root "data"

Show-Status ".env" (Test-Path $envPath) "found" "missing from project root"
Show-Status ".env.example" (Test-Path $envExamplePath) "found" "missing from project root"
Show-Status "data folder" (Test-Path $dataPath) "found" "missing from project root"

Write-Host ""

$requiredDataFiles = @(
  "settings.json",
  "reviews.json",
  "tickets.json",
  "giveaways.json"
)

foreach ($file in $requiredDataFiles) {
  $fullPath = Join-Path $dataPath $file
  Show-Status ("data\$file") (Test-Path $fullPath) "found" "missing"
}

Write-Host ""

if (Test-Path $envPath) {
  $envLines = Get-Content $envPath
  $envMap = @{}

  foreach ($line in $envLines) {
    if ($line -match '^\s*#') { continue }
    if ($line -match '^\s*$') { continue }

    $parts = $line -split '=', 2
    if ($parts.Count -eq 2) {
      $envMap[$parts[0].Trim()] = $parts[1].Trim()
    }
  }

  $requiredEnvKeys = @(
    "DISCORD_TOKEN",
    "DISCORD_CLIENT_ID",
    "DISCORD_GUILD_ID",
    "DEFAULT_ADMIN_KEY"
  )

  $optionalEnvKeys = @(
    "OPAY_MERCHANT_ID",
    "OPAY_HASH_KEY",
    "OPAY_HASH_IV",
    "OPAY_RETURN_URL",
    "OPAY_PAYMENT_INFO_URL"
  )

  Write-Host ".env required keys:" -ForegroundColor Cyan
  foreach ($key in $requiredEnvKeys) {
    $hasValue = $envMap.ContainsKey($key) -and -not [string]::IsNullOrWhiteSpace($envMap[$key])
    Show-Status $key $hasValue "configured" "missing or empty"
  }

  Write-Host ""
  Write-Host ".env optional payment keys:" -ForegroundColor Cyan
  foreach ($key in $optionalEnvKeys) {
    $hasValue = $envMap.ContainsKey($key) -and -not [string]::IsNullOrWhiteSpace($envMap[$key])
    Show-Status $key $hasValue "configured" "empty (only needed for OPay payment flow)"
  }
} else {
  Write-Host "Skip .env validation because .env was not found." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next steps:" -ForegroundColor Cyan
Write-Host "1. Install missing tools shown above."
Write-Host "2. Make sure .env and data files came from the old computer."
Write-Host "3. Run: npm install"
Write-Host "4. Run: npm run dev"
