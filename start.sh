#!/bin/bash
set -e

echo "╔══════════════════════════════════════════════╗"
echo "║  HORMUZ CRISIS — FLEET COMMAND SYSTEM       ║"
echo "║  Starting all services...                   ║"
echo "╚══════════════════════════════════════════════╝"

# Check for .env
if [ ! -f .env ]; then
  cp .env.example .env
  echo "⚠  Created .env from template. Add your ANTHROPIC_API_KEY for AI features."
fi

# Load env
export $(cat .env | grep -v '^#' | xargs) 2>/dev/null || true

# Start backend
echo ""
echo "▶ Starting backend server (port 4000)..."
cd backend && npm install --silent && node index.js &
BACKEND_PID=$!
cd ..

# Wait for backend
echo "  Waiting for backend..."
for i in {1..15}; do
  if curl -sf http://localhost:4000/api/health > /dev/null 2>&1; then
    echo "  ✓ Backend online"
    break
  fi
  sleep 1
done

# Start frontend
echo ""
echo "▶ Starting frontend (port 3000)..."
cd frontend
NEXT_PUBLIC_WS_URL=ws://localhost:4000 npm run start &
FRONTEND_PID=$!
cd ..

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║  SYSTEM ONLINE                              ║"
echo "║                                             ║"
echo "║  Frontend:  http://localhost:3000           ║"
echo "║  Backend:   http://localhost:4000           ║"
echo "║  Health:    http://localhost:4000/api/health║"
echo "╚══════════════════════════════════════════════╝"
echo ""
echo "Press Ctrl+C to stop all services."

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Shutdown complete.'; exit 0" INT TERM
wait
