#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

echo "==================================================================="
echo "    MATÉRIA REATIVA - SISTEMA INTEGRADO DE GESTÃO LABORATÓRIO"
echo "==================================================================="
echo ""

open_browser() {
  local url="$1"
  if command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url" >/dev/null 2>&1 &
  elif command -v open >/dev/null 2>&1; then
    open "$url" >/dev/null 2>&1 &
  fi
}

if command -v node >/dev/null 2>&1; then
  echo "[✓] Node.js detectado!"
  if [ ! -d "node_modules" ]; then
    echo "[i] Instalando dependências..."
    npm install
  fi

  echo "[i] Abrindo o sistema no navegador..."
  open_browser "http://localhost:3000"
  echo "[i] Iniciando servidor do sistema na porta 3000..."
  exec npm run dev
fi

if command -v python3 >/dev/null 2>&1; then
  echo "[✓] Iniciando servidor via Python..."
  open_browser "http://localhost:3000"
  if [ -d "dist" ]; then
    exec python3 -m http.server 3000 --directory dist
  else
    exec python3 -m http.server 3000
  fi
fi

echo "[i] Abrindo no navegador..."
open_browser "http://localhost:3000"
