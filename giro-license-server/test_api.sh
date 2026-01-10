#!/bin/bash
export PAGER=cat
export LESS="-R"

echo "=== Testing GIRO License Server API ==="

echo -e "\n1. Health Check:"
curl -s http://localhost:3000/api/v1/health

echo -e "\n\n2. Login with seed admin (password: password123):"
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@giro.com.br","password":"password123"}')
echo "$LOGIN_RESPONSE"

# Extract token
TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)

if [ -n "$TOKEN" ]; then
  echo -e "\n\n3. Get /auth/me with token:"
  curl -s http://localhost:3000/api/v1/auth/me \
    -H "Authorization: Bearer $TOKEN"

  echo -e "\n\n4. List licenses:"
  curl -s http://localhost:3000/api/v1/licenses \
    -H "Authorization: Bearer $TOKEN"

  echo -e "\n\n5. Get license stats:"
  curl -s http://localhost:3000/api/v1/licenses/stats \
    -H "Authorization: Bearer $TOKEN"
else
  echo -e "\n\nLogin failed - cannot continue tests"
fi

echo -e "\n\nDone!"
