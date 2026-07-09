# ═══════════════════════════════════════════════════════
# Deploy a producción en Vercel — ARISE: Shadow Connect
# ═══════════════════════════════════════════════════════
# Uso:
#   .\deploy.ps1              → corre los tests y, si pasan, despliega a producción
#   .\deploy.ps1 -SkipTests   → despliega directo (sin correr tests)
#
# Requiere: Vercel CLI autenticado (npx vercel whoami) y el proyecto vinculado
# (carpeta .vercel/). Mientras el auto-deploy GitHub↔Vercel no esté activo,
# este es el camino oficial para publicar.
# ═══════════════════════════════════════════════════════
param([switch]$SkipTests)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

if (-not $SkipTests) {
    Write-Host ''
    Write-Host '► Corriendo tests antes de desplegar...' -ForegroundColor Cyan
    npm test
    if ($LASTEXITCODE -ne 0) {
        Write-Host ''
        Write-Host '✗ Los tests fallaron. Deploy abortado.' -ForegroundColor Red
        exit 1
    }
    Write-Host '✓ Tests en verde.' -ForegroundColor Green
}

Write-Host ''
Write-Host '► Desplegando a producción en Vercel...' -ForegroundColor Cyan
npx vercel --prod --yes
if ($LASTEXITCODE -ne 0) {
    Write-Host ''
    Write-Host '✗ El deploy falló. Revisa la salida de Vercel arriba.' -ForegroundColor Red
    exit 1
}

Write-Host ''
Write-Host '✅ Producción actualizada → https://arise-shadow-connect.vercel.app' -ForegroundColor Green
