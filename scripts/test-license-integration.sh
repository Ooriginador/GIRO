#!/bin/bash
# Test script for GIRO License Server integration

echo "=========================================="
echo "GIRO License Server Integration Test"
echo "=========================================="
echo ""

# Configuration
LICENSE_SERVER="https://giro-license-server-production.up.railway.app"
DASHBOARD="https://giro-dashboard-production.up.railway.app"

# Must be 64 hex chars to satisfy server validation
HARDWARE_ID="0000000000000000000000000000000000000000000000000000000000000000"

# Test 1: Backend Health
echo "1. Testing Backend Health..."
BACKEND_HEALTH=$(curl -s --max-time 10 "$LICENSE_SERVER/api/v1/health")
echo "   Response: $BACKEND_HEALTH"
echo ""

# Test 2: Dashboard Health
echo "2. Testing Dashboard Health..."
DASHBOARD_HEALTH=$(curl -s --max-time 10 "$DASHBOARD/api/v1/health")
echo "   Response: $DASHBOARD_HEALTH"
echo ""

# Test 3: Invalid License Validation (should return 404)
echo "3. Testing Invalid License Validation..."
INVALID_RESPONSE=$(curl -s --max-time 10 -X POST "$LICENSE_SERVER/api/v1/licenses/INVALID-KEY/validate" \
  -H "Content-Type: application/json" \
    -d '{"license_key":"INVALID-KEY","hardware_id":"'$HARDWARE_ID'","client_time":"2026-01-11T22:00:00Z"}')
echo "   Response: $INVALID_RESPONSE"
echo ""

# Test 4: Check server time endpoint
echo "4. Testing Server Time Endpoint..."
TIME_RESPONSE=$(curl -s --max-time 10 "$LICENSE_SERVER/api/v1/metrics/time")
echo "   Response: $TIME_RESPONSE"
echo ""

# Summary
echo "=========================================="
echo "Integration Test Complete"
echo "=========================================="

# Check results
if echo "$BACKEND_HEALTH" | grep -q "healthy"; then
    echo "✅ Backend: HEALTHY"
else
    echo "❌ Backend: FAILED"
fi

if echo "$DASHBOARD_HEALTH" | grep -q "healthy"; then
    echo "✅ Dashboard: HEALTHY"
else
    echo "❌ Dashboard: FAILED"
fi

if echo "$INVALID_RESPONSE" | grep -qi "not found\|license not found\|licen[çc]a n[ãa]o encontrada"; then
    echo "✅ License Validation: Working (correctly rejects invalid keys)"
else
    echo "⚠️  License Validation: Response - $INVALID_RESPONSE"
fi
