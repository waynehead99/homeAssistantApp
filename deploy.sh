#!/bin/bash

# Home Assistant Dashboard - Docker Deployment Script
# Usage: ./deploy.sh

set -e

echo "================================================"
echo "  Home Assistant Dashboard - Docker Deployment"
echo "================================================"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo ""
    echo "⚠️  Please edit .env file with your settings:"
    echo "   - VITE_HA_URL: Your Home Assistant URL"
    echo "   - VITE_HA_TOKEN: Your long-lived access token"
    echo "   - VITE_FRIGATE_URL: (Optional) Frigate URL"
    echo "   - VITE_CLAUDE_API_KEY: (Optional) Claude API key"
    echo ""
    echo "Then run this script again."
    exit 1
fi

# Load environment variables
source .env

# Validate required variables
if [ -z "$VITE_HA_URL" ] || [ -z "$VITE_HA_TOKEN" ]; then
    echo "❌ Error: VITE_HA_URL and VITE_HA_TOKEN are required in .env"
    exit 1
fi

echo "✓ Configuration loaded"
echo "  Home Assistant: $VITE_HA_URL"
echo ""

# Check for Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed"
    exit 1
fi

# Check for Docker Compose
if command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
elif docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
else
    echo "❌ Error: Docker Compose is not installed"
    exit 1
fi

echo "✓ Docker found"
echo ""

# Build and deploy
echo "Building and deploying..."
echo ""

$COMPOSE_CMD down --remove-orphans 2>/dev/null || true
$COMPOSE_CMD build --no-cache
$COMPOSE_CMD up -d

echo ""
echo "================================================"
echo "  ✅ Deployment Complete!"
echo "================================================"
echo ""
echo "Dashboard is running at: http://localhost:3000"
echo ""
echo "Useful commands:"
echo "  View logs:    $COMPOSE_CMD logs -f"
echo "  Stop:         $COMPOSE_CMD down"
echo "  Restart:      $COMPOSE_CMD restart"
echo "  Rebuild:      $COMPOSE_CMD up -d --build"
echo ""
