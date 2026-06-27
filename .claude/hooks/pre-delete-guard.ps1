# ═══════════════════════════════════════════════════════
# HOOK: PreToolUse — Protección contra Borrado
# Dispara: antes de Bash | PowerShell
# Exit 2  → bloquea la herramienta en Claude Code
# Exit 0  → deja pasar normalmente
# ═══════════════════════════════════════════════════════
param()
$ErrorActionPreference = 'Continue'

# ── 1. Leer y parsear el JSON de entrada ──
$json = [Console]::In.ReadToEnd()
$hookData = $null
try { $hookData = $json | ConvertFrom-Json } catch { exit 0 }

$command = $hookData.tool_input.command
if (-not $command) { exit 0 }

# ── 2. Patrones que indican borrado de archivos ──
$deletionPatterns = @(
    'git rm',
    'git clean',
    'Remove-Item',
    'rm -rf',
    'rm -r ',
    'rm -f ',
    '\brm\b.*\.(?:js|html|css|json|md|ps1)',
    'del /[fqs]',
    '\bdel\b.*\.(?:js|html|css|json|md|ps1)',
    'rmdir /s',
    'rd /s'
)

$isDeletion  = $false
$matchedRule = ''
foreach ($pattern in $deletionPatterns) {
    if ($command -match $pattern) {
        $isDeletion  = $true
        $matchedRule = $pattern
        break
    }
}

# ── 3. No es borrado → dejar pasar ──
if (-not $isDeletion) { exit 0 }

# ── 4. Extraer archivos o rutas del comando ──
$projectDir = Get-Location
$targets = @()

# Intentar extraer paths del comando (heurística)
$tokens = $command -split '\s+' | Where-Object { $_ -match '\.' -and $_ -notmatch '^-' }
foreach ($token in $tokens) {
    $clean = $token.Trim('"').Trim("'")
    if (Test-Path (Join-Path $projectDir $clean)) {
        $targets += $clean
    } elseif ($clean -match '\.(js|html|css|json|md|ps1)$') {
        $targets += $clean
    }
}

# ── 5. Analizar impacto de cada archivo en riesgo ──
$impactMap = @{
    'arise-shadow-connect-v2.html' = 'Estructura HTML principal del juego. Borrarlo elimina toda la UI.'
    'styles.css'                   = 'Todos los estilos visuales y animaciones. Sin él el juego no tiene apariencia.'
    'game.js'                      = 'Lógica del juego, IA, sistema de rangos y audio. Sin él el juego no funciona.'
    'game-logic.js'                = 'Módulo de lógica pura exportable usado por los tests unitarios.'
    'game-logic.test.js'           = 'Suite de 34 tests unitarios. Borrarlo elimina toda la cobertura de tests.'
    'CLAUDE.md'                    = 'Documentación de arquitectura y contrato de baseline del proyecto.'
    '.gitignore'                   = 'Excluye node_modules y archivos de tests del repositorio. Borrarlo causaría commits accidentales.'
    'package.json'                 = 'Configuración de npm y vitest. Sin él no es posible correr los tests.'
    'vitest.config.js'             = 'Configuración del entorno de tests (jsdom, reporters). Necesario para vitest.'
}

# ── 6. Cabecera de bloqueo ──
Write-Host ''
Write-Host '╔══════════════════════════════════════════════╗' -ForegroundColor Red
Write-Host '║  🛡  ARISE · DELETE GUARD  [PreToolUse]     ║' -ForegroundColor Red
Write-Host '╚══════════════════════════════════════════════╝' -ForegroundColor Red
Write-Host ''
Write-Host '  ⛔ OPERACIÓN BLOQUEADA — Intento de borrado detectado' -ForegroundColor Red
Write-Host ''
Write-Host '  Comando interceptado:' -ForegroundColor Yellow
Write-Host "    $command" -ForegroundColor White
Write-Host ''
Write-Host "  Patrón de riesgo: '$matchedRule'" -ForegroundColor Yellow
Write-Host ''

# ── 7. Análisis de impacto por archivo ──
if ($targets.Count -gt 0) {
    Write-Host '  📋 Análisis de impacto:' -ForegroundColor Cyan
    foreach ($target in $targets) {
        $fileName = Split-Path $target -Leaf
        $impact   = $impactMap[$fileName]
        if (-not $impact) { $impact = 'Archivo del proyecto. Evaluar dependencias antes de borrar.' }
        Write-Host ''
        Write-Host "  ▸ $fileName" -ForegroundColor Yellow
        Write-Host "    Impacto: $impact" -ForegroundColor White
    }
} else {
    Write-Host '  ⚠ No se pudo identificar archivos específicos.' -ForegroundColor Yellow
    Write-Host '    Revisar el comando manualmente antes de proceder.' -ForegroundColor White
}

Write-Host ''
Write-Host '  ► Protocolo obligatorio antes de borrar:' -ForegroundColor Cyan
Write-Host '    1. Claude debe explicar por qué necesita borrar este archivo' -ForegroundColor White
Write-Host '    2. Claude debe indicar si el archivo está respaldado en git'  -ForegroundColor White
Write-Host '    3. Claude debe proponer alternativa si existe'                 -ForegroundColor White
Write-Host '    4. El USUARIO debe escribir confirmación explícita'            -ForegroundColor White
Write-Host ''
Write-Host '  [REQUIERE_CONFIRMACION_USUARIO] — Operación en espera.' -ForegroundColor Magenta
Write-Host '══════════════════════════════════════════════' -ForegroundColor Red

exit 2
