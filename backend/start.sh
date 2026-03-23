#!/bin/bash

# ─────────────────────────────────────────────
# PharmaLens Backend — Server Startup Script
# Run this once after uploading code to server
# ─────────────────────────────────────────────

set -e

APP_DIR="/app"
VENV="$APP_DIR/venv"

echo "📁 Moving to app directory..."
cd $APP_DIR

echo "⚡ Activating virtual environment..."
source $VENV/bin/activate

echo "📦 Installing requirements..."
pip install -r requirements.txt --quiet

echo "🚀 Starting FastAPI backend..."
uvicorn backend.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers 2 \
    --log-level info