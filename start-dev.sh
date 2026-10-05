#!/bin/bash
# Development mode with hot reload

if [ ! -f .env ]; then
  cp .env.example .env
fi
export $(cat .env | grep -v '^#' | xargs) 2>/dev/null || true

echo "Starting HORMUZ CRISIS in dev mode..."

# Backend with file watching
cd backend && node --watch index.js &
BACKEND_PID=$!
cd ..

sleep 3

# Frontend dev server
cd frontend
NEXT_PUBLIC_WS_URL=ws://localhost:4000 npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "Dev servers running:"
echo "  Frontend: http://localhost:3000  (hot reload)"
echo "  Backend:  http://localhost:4000  (file watch)"
echo ""
echo "Ctrl+C to stop."

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM
wait
