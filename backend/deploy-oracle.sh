#!/bin/bash
# ==============================================================================
# SOFIYA BANGLES - ORACLE CLOUD AUTOMATED DEPLOYMENT SCRIPT
# ==============================================================================
# Run this script on your Oracle Cloud VM to pull updates, build, and reload PM2.
# Usage:
#   chmod +x deploy-oracle.sh
#   ./deploy-oracle.sh
# ==============================================================================

set -e

echo "🚀 [1/5] Pulling latest code from Git..."
git pull origin main || git pull origin feature-development

echo "📦 [2/5] Installing backend dependencies..."
cd "$(dirname "$0")"
npm ci --omit=dev

echo "🔨 [3/5] Compiling TypeScript source..."
# If dev dependencies like tsc were omitted, compile via global or local tsc
if ! command -v tsc &> /dev/null; then
  npm install typescript @types/node --no-save
fi
npm run build

echo "📁 [4/5] Creating logs directory..."
mkdir -p logs

echo "♻️  [5/5] Reloading PM2 process..."
if command -v pm2 &> /dev/null; then
  pm2 reload ecosystem.config.js --env production || pm2 start ecosystem.config.js --env production
  pm2 save
  echo "✅ Backend successfully deployed and running under PM2!"
  pm2 status sofiya-backend
else
  echo "⚠️ PM2 not found globally. Starting with Node directly or install PM2 via: sudo npm i -g pm2"
fi
