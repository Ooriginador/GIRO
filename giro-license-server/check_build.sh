#!/bin/bash
# Script de build e verificação do GIRO License Server
set -e

export PAGER=cat
export LESS=

echo "=== GIRO License Server - Build Check ==="
echo ""

cd /home/jhonslife/Mercearias/giro-license-server/backend

echo "1. Checking Rust version..."
rustc --version
cargo --version

echo ""
echo "2. Running cargo check..."
cargo check 2>&1

echo ""
echo "3. Build successful! ✅"
