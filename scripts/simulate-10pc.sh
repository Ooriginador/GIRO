#!/bin/bash

# Script de Simulação de Carga de 10 PCs
# Uso: ./scripts/simulate-10pc.sh [duração_em_segundos]

DURATION=${1:-3600} # Padr o 1 hora (3600s)

echo "=================================================="
echo "🚀 INICIANDO SIMULAÇÃO DE REDE COM 10 PCs"
echo "=================================================="
echo "⏱️  Duração planejada: $(($DURATION / 60)) minutos"
echo "🖥️  Workers (PCs): 10"
echo "📂 Report: playwright-report/simulation"
echo "=================================================="

# Exporta a duração para o teste pegar via process.env
export SIMULATION_DURATION=$((DURATION * 1000))

# Resolve o diretório onde o script está localizado
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Navega para o diretório do app (sobe um nível de scripts/ para a raiz do monorepo, depois desce para apps/desktop)
cd "$SCRIPT_DIR/../apps/desktop" || exit 1

# Garante que as dependências estão instaladas
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependências..."
    pnpm install
fi

# Roda o Playwright com o config de simulação
# --headed opcional: remova se quiser ver os 10 browsers abrindo (pode travar a máquina)
echo "▶️  Executando testes E2E em paralelo..."

npx playwright test --config=playwright.simulation.config.ts

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "✅ Simulação finalizada com SUCESSO."
else
    echo "⚠️  Simulação finalizada com ERROS (alguns fluxos falharam)."
fi

echo "📊 Relatório gerado em apps/desktop/simulation-report/index.html"
exit $EXIT_CODE
