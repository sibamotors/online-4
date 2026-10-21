#!/usr/bin/env bash
# Run on the VPS from the project directory: ./deploy/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || { echo "Missing .env (copy .env.example and fill it in)"; exit 1; }

git pull --ff-only
npm ci
npm run build
npm run db:migrate

if pm2 describe sibamotor >/dev/null 2>&1; then
  pm2 reload ecosystem.config.cjs --update-env
else
  pm2 start ecosystem.config.cjs
fi
pm2 save

# wake the app once so its background jobs (Bale bot, reminders) start right away
sleep 3
curl -fsS -o /dev/null "http://127.0.0.1:${PORT:-3000}/login" || true
