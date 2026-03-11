#!/bin/bash

# MCP Manager - Script de démarrage
# Lance le backend et le frontend en parallèle

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🚀 Démarrage de MCP Manager..."
echo ""

# Fonction pour arrêter proprement les processus
cleanup() {
    echo ""
    echo "🛑 Arrêt des services..."
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Démarrage du backend
echo "📦 Démarrage du backend..."
cd "$SCRIPT_DIR/backend"
npm run dev &
BACKEND_PID=$!

# Attendre un peu que le backend démarre
sleep 2

# Démarrage du frontend
echo "🎨 Démarrage du frontend..."
cd "$SCRIPT_DIR/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Services démarrés !"
echo "   Backend:  http://localhost:3001"
echo "   Frontend: http://localhost:5173"
echo ""
echo "Appuyez sur Ctrl+C pour arrêter les services."

# Attendre que les processus se terminent
wait $BACKEND_PID $FRONTEND_PID
