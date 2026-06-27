# ═══════════════════════════════════════════════════════
# HOOK: PostToolUse — Auto-Test con Vitest
# Dispara: después de Write | Edit sobre archivos fuente
# ═══════════════════════════════════════════════════════
param()
$ErrorActionPreference = 'Continue'

# ── 1. Leer y parsear el JSON que Claude Code envía por stdin ──
$json = [Console]::In.ReadToEnd()
$hookData = $null
try { $hookData = $json | ConvertFrom-Json } catch {}

# ── 2. Filtro de extensión: solo correr tests para archivos fuente ──
$filePath = ''
if ($hookData) {
    $filePath = $hookData.tool_input.file_path
    if (-not $filePath) { $filePath = $hookData.tool_input.path }
}
if ($filePath -and $filePath -notmatch '\.(js|html|css)$') { exit 0 }

# ── 3. Verificar que el entorno de tests esté instalado ──
$projectDir = Get-Location
$pkgPath    = Join-Path $projectDir 'package.json'
$nmPath     = Join-Path $projectDir 'node_modules'

if (-not (Test-Path $pkgPath) -or -not (Test-Path $nmPath)) { exit 0 }

# ── 4. Cabecera del reporte ──
Write-Host ''
Write-Host '╔══════════════════════════════════════════════╗' -ForegroundColor Cyan
Write-Host '║  ⚡ ARISE · AUTO-TEST  [PostToolUse Hook]   ║' -ForegroundColor Cyan
Write-Host '╚══════════════════════════════════════════════╝' -ForegroundColor Cyan
if ($filePath) {
    Write-Host "  Archivo modificado: $filePath" -ForegroundColor DarkCyan
}
Write-Host ''

# ── 5. Ejecutar vitest ──
$rawOutput = & npm test 2>&1
$exitCode  = $LASTEXITCODE

# ── 6. Mostrar salida coloreada ──
foreach ($line in $rawOutput) {
    $lineStr = $line.ToString()
    if     ($lineStr -match 'FAIL|✗|×|Error:|expected')  { Write-Host $lineStr -ForegroundColor Red    }
    elseif ($lineStr -match 'PASS|✓|√|passed')           { Write-Host $lineStr -ForegroundColor Green  }
    elseif ($lineStr -match 'WARN|SKIP|todo')             { Write-Host $lineStr -ForegroundColor Yellow }
    elseif ($lineStr -match 'Test Files|Tests|Duration')  { Write-Host $lineStr -ForegroundColor Cyan   }
    else                                                  { Write-Host $lineStr                         }
}

# ── 7. Rama de éxito ──
if ($exitCode -eq 0) {
    Write-Host ''
    Write-Host '  ✅ Todos los tests pasaron.' -ForegroundColor Green
    Write-Host '══════════════════════════════════════════════' -ForegroundColor Cyan
    exit 0
}

# ── 8. Rama de fallo → Hook "Error" integrado ──
# Extraer tests fallidos de la salida de vitest
$failedTests = $rawOutput | Where-Object { $_ -match '✗|FAIL|× ' } | ForEach-Object { $_.ToString().Trim() }

Write-Host ''
Write-Host '══════════════════════════════════════════════' -ForegroundColor Red
Write-Host '  🔴 HOOK ERROR :: VITEST_FAILED             ' -ForegroundColor Red
Write-Host '══════════════════════════════════════════════' -ForegroundColor Red
Write-Host ''
Write-Host '  ► Tests fallidos detectados:' -ForegroundColor Yellow
foreach ($t in $failedTests) { Write-Host "    $t" -ForegroundColor Red }
Write-Host ''
Write-Host '  ► Protocolo de corrección (Claude debe seguir):' -ForegroundColor Yellow
Write-Host '    1. Leer la salida de Vitest completa (arriba)'  -ForegroundColor White
Write-Host '    2. Identificar: archivo, nombre del test, error exacto' -ForegroundColor White
Write-Host '    3. Analizar la causa raíz sin tocar código aún' -ForegroundColor White
Write-Host '    4. Redactar plan de corrección paso a paso'     -ForegroundColor White
Write-Host '    5. Presentar el plan al usuario y ESPERAR'      -ForegroundColor White
Write-Host '    6. Corregir SOLO si el usuario aprueba explícitamente' -ForegroundColor White
Write-Host ''
Write-Host '  [AWAITING_APPROVAL] — No corregir hasta aprobación.' -ForegroundColor Magenta
Write-Host '══════════════════════════════════════════════' -ForegroundColor Red
exit 1
