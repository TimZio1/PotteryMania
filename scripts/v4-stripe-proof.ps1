# V4 Stripe proof — refresh automated dedup log + print manual checklist
# Run from potterymania/:  .\scripts\v4-stripe-proof.ps1

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location $root

$outDir = Join-Path $root "launch-proof\V4-stripe\automated"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$logFile = Join-Path $outDir "v4-dedup-vitest-log.txt"

Write-Host "== V4 automated: Vitest stripe-webhook-dedup ==" -ForegroundColor Cyan
$testOutput = npx vitest run lib/stripe-webhook-dedup.test.ts --reporter=verbose 2>&1 | Out-String
if ($LASTEXITCODE -ne 0) {
  Write-Host $testOutput
  exit $LASTEXITCODE
}

$stamp = Get-Date -Format "o"
@"
V4 — Automated partial proof (idempotency helpers)
Regenerated: $stamp
Working directory: $root

$testOutput
---
NOTE: Full V4 requires manual RUNBOOK steps + screenshots in launch-proof/V4-stripe/
"@ | Set-Content -Encoding utf8 $logFile

Write-Host $testOutput
Write-Host ""
Write-Host "Wrote: $logFile" -ForegroundColor Green
Write-Host "Next: follow launch-proof\V4-stripe\RUNBOOK.md for Dashboard screenshots + retry proof." -ForegroundColor Yellow
