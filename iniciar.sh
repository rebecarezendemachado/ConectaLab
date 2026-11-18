#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

echo "==================================================================="
echo "    MATÉRIA REATIVA - SISTEMA INTEGRADO DE GESTÃO LABORATORIAL"
echo "==================================================================="

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Instale Node.js 22.13 ou superior (incluindo npm) em https://nodejs.org."
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
NODE_MINOR="$(node -p 'process.versions.node.split(".")[1]')"
if (( NODE_MAJOR < 22 || (NODE_MAJOR == 22 && NODE_MINOR < 13) )); then
  echo "Este sistema precisa do Node.js 22.13 ou superior. Atualize em https://nodejs.org."
  exit 1
fi

if [ ! -d node_modules ]; then
  echo "Instalando os componentes necessários. Na primeira vez pode levar alguns minutos..."
  npm install --include=dev
fi

npm run build
echo "Abrindo Matéria Reativa em http://127.0.0.1:3000"
if command -v xdg-open >/dev/null 2>&1; then
  xdg-open "http://127.0.0.1:3000" >/dev/null 2>&1 &
elif command -v open >/dev/null 2>&1; then
  open "http://127.0.0.1:3000" >/dev/null 2>&1 &
fi
echo "Mantenha este terminal aberto enquanto usa o sistema."
exec npm run dev
