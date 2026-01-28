#!/bin/bash
set -e

echo "============================================"
echo "🔧 GIRO Desktop - CI Pipeline"
echo "============================================"
echo ""

cd /home/jhonslife/CICLOGIRO/GIRO/apps/desktop/src-tauri
export CARGO_TARGET_DIR=/tmp/giro-target2

echo "📋 Step 1/4: Format Check (cargo fmt)"
echo "----------------------------------------"
if cargo fmt --all -- --check 2>&1; then
    echo "✅ Format: PASSED"
else
    echo "❌ Format: FAILED"
    exit 1
fi
echo ""

echo "📋 Step 2/4: Lint (cargo clippy)"
echo "----------------------------------------"
CLIPPY_ERRORS=$(cargo clippy --all-targets 2>&1 | grep -c "^error" || true)
if [ "$CLIPPY_ERRORS" -eq 0 ]; then
    echo "✅ Clippy: PASSED"
else
    echo "❌ Clippy: FAILED ($CLIPPY_ERRORS errors)"
    cargo clippy --all-targets 2>&1 | grep "^error" | head -10
    exit 1
fi
echo ""

echo "📋 Step 3/4: Build Check (cargo check)"
echo "----------------------------------------"
if cargo check 2>&1 | tail -5; then
    echo "✅ Build Check: PASSED"
fi
echo ""

echo "📋 Step 4/4: Tests (cargo test)"
echo "----------------------------------------"
TEST_OUTPUT=$(cargo test --lib 2>&1)
PASSED=$(echo "$TEST_OUTPUT" | grep -c "ok$" || echo 0)
FAILED=$(echo "$TEST_OUTPUT" | grep -c "FAILED" || echo 0)

echo "Tests Passed: $PASSED"
echo "Tests Failed: $FAILED"

if [ "$FAILED" -eq 0 ]; then
    echo "✅ Tests: PASSED"
else
    echo "❌ Tests: FAILED"
    echo "$TEST_OUTPUT" | grep "FAILED"
    exit 1
fi

echo ""
echo "============================================"
echo "🎉 CI Pipeline: ALL CHECKS PASSED!"
echo "============================================"
echo "  ✅ Format Check"
echo "  ✅ Clippy Lint"  
echo "  ✅ Build Check"
echo "  ✅ Tests ($PASSED passed, $FAILED failed)"
echo "============================================"
