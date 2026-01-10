#!/bin/bash

# Script to start License Server development environment

set -e

echo "🚀 Starting GIRO License Server Development Environment"
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Start PostgreSQL and Redis if not running
echo "🐘 Starting PostgreSQL and Redis..."
cd "$(dirname "$0")"

#  Start databases with docker run instead of compose
docker run -d --name giro-license-db \
    -e POSTGRES_DB=giro_licenses \
    -e POSTGRES_USER=giro \
    -e POSTGRES_PASSWORD=giro_dev_password \
    -p 5432:5432 \
    postgres:16-alpine || echo "Database already running"

docker run -d --name giro-license-cache \
    -p 6379:6379 \
    redis:7-alpine || echo "Redis already running"

echo "⏳ Waiting for databases to be ready..."
sleep 3

echo ""
echo "✅ Databases are ready!"
echo ""
echo "📝 Environment:"
echo "   - PostgreSQL: localhost:5432 (user: giro, db: giro_licenses)"
echo "   - Redis: localhost:6379"
echo ""
echo "🔧 To run the server:"
echo "   cd backend"
echo "   cargo run"
echo ""
echo "📊 To stop databases:"
echo "   docker stop giro-license-db giro-license-cache"
echo "   docker rm giro-license-db giro-license-cache"
