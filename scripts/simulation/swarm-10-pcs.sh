#!/bin/bash
# GIRO/scripts/simulation/swarm-10-pcs.sh

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
RUNNER="$SCRIPT_DIR/run-pc-instance.sh"

echo "🚀 Iniciando ENXAME de Simulação (10 PCs)..."

# Lista de PCs e Funções
PCS=(
    "PC-01-CAIXA"
    "PC-02-CAIXA"
    "PC-03-ESTOQUE"
    "PC-04-GERENTE"
    "PC-05-VENDEDOR"
    "PC-06-VENDEDOR"
    "PC-07-ADM"
    "PC-08-FINANCEIRO"
    "PC-09-CADASTRO"
    "PC-10-RESERVA"
)

for pc in "${PCS[@]}"; do
    bash "$RUNNER" "$pc"
    sleep 1 # Pausa para não sobrecarregar I/O na partida
done

echo ""
echo "=================================================="
echo "🌐 Rede Simulada Operacional"
echo "=================================================="
echo "📊 Para monitorar logs de um PC:"
echo "   tail -f simulation_data/PC-04-GERENTE/logs/runtime.log"
echo ""
echo "💀 Para matar todas as instâncias:"
echo "   pkill -f giro-simulated"
