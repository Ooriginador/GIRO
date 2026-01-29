#!/bin/bash
# ============================================================================
# GIRO Multi-PC Test Runner
# Quick launcher for the test harness
# ============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "╔════════════════════════════════════════════════════════════╗"
echo "║         🧪 GIRO Multi-PC Test Runner                       ║"
echo "║              Arkheion Corp © 2026                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if simulation is running
PC_COUNT=$(pgrep -c giro-desktop 2>/dev/null || echo "0")
echo "📊 Instances running: $PC_COUNT"

if [ "$PC_COUNT" -lt 10 ]; then
    echo "⚠️  Warning: Not all 10 instances are running!"
    echo "   Run ./swarm-10-pcs.sh to start all instances."
fi

echo ""
echo "Select test scenario:"
echo "  1) Full suite (all tests)"
echo "  2) Database only"
echo "  3) Network only"
echo "  4) Sync only"
echo "  5) PDV only"
echo "  6) Stress tests"
echo "  7) Continuous monitoring (dashboard)"
echo ""
read -p "Option [1-7]: " option

case $option in
    1)
        python3 multi_pc_test_harness.py --scenario=all --report=all
        ;;
    2)
        python3 multi_pc_test_harness.py --scenario=database --report=console
        ;;
    3)
        python3 multi_pc_test_harness.py --scenario=network --report=console
        ;;
    4)
        python3 multi_pc_test_harness.py --scenario=sync --report=console
        ;;
    5)
        python3 multi_pc_test_harness.py --scenario=pdv --report=console
        ;;
    6)
        python3 multi_pc_test_harness.py --scenario=stress --report=console
        ;;
    7)
        python3 continuous_test_runner.py --interval=15 --duration=3600
        ;;
    *)
        echo "Invalid option"
        exit 1
        ;;
esac

echo ""
echo "📁 Reports saved to: /tmp/giro-sim/test-reports/"
ls -la /tmp/giro-sim/test-reports/*.html 2>/dev/null || echo "   (no HTML reports yet)"
