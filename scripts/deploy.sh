#!/usr/bin/env bash
# Runs ON THE SERVER. Updates the app to the latest code, builds it and restarts it.
#   bash scripts/deploy.sh            -> pulls the latest code from GitHub first
#   NO_GIT=1 bash scripts/deploy.sh   -> code was already copied here (e.g. by GitHub Actions + rsync)
# If the build fails nothing is restarted, so the running version keeps working.
set -euo pipefail
cd "$(dirname "$0")/.."

APP_NAME="${APP_NAME:-sibamotor}"
BRANCH="${DEPLOY_BRANCH:-main}"
PORT="${PORT:-3000}"

if [ -z "${NO_GIT:-}" ]; then
  echo "[deploy] pulling origin/$BRANCH"
  git fetch --prune origin
  git reset --hard "origin/$BRANCH"   # .env is not tracked, so it is left alone
fi

[ -f .env ] || { echo "[deploy] ERROR: .env is missing in $(pwd)"; exit 1; }

echo "[deploy] installing dependencies"
npm ci
echo "[deploy] building"
npm run build

echo "[deploy] restarting $APP_NAME"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 restart "$APP_NAME" --update-env
else
  NODE_ENV=production PORT="$PORT" pm2 start npm --name "$APP_NAME" -- start
fi
pm2 save >/dev/null
echo "[deploy] done: $(git rev-parse --short HEAD 2>/dev/null || echo 'no git')"
