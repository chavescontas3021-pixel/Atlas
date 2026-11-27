#!/usr/bin/env bash
cd "$(dirname "$0")" || exit 1
command -v termux-wake-lock >/dev/null 2>&1 && termux-wake-lock
while true; do
  node src/index.js
  codigo=$?
  if [ "$codigo" -eq 2 ]; then
    echo "[iniciar] erro de configuração no .env. Corrija e rode de novo."
    exit 2
  fi
  echo "[iniciar] o bot parou (código $codigo). Reiniciando em 5s..."
  sleep 5
done
