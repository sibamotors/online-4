#!/usr/bin/env bash
# Run on the VPS from the project directory: ./deploy/deploy.sh
set -euo pipefail
cd "$(dirname "$0")/.."

[ -f .env ] || { echo "Missing .env (copy .env.example and fill it in)"; exit 1; }

# an earlier "npm install" on the server may have rewritten the lock file; the repository's copy wins
git checkout -- package-lock.json 2>/dev/null || true
git pull --ff-only
echo "== code version: $(git log -1 --format='%h  %s  (%cd)' --date=short)  |  $(cat public/version.txt 2>/dev/null || echo no-version-file)"
[ -f src/routes/conference.tsx ] && echo "== newest files are present (conference.tsx)" || echo "== WARNING: conference.tsx is missing: GitHub does not have the newest files, or git pull did not fetch them"

# "npm ci" is exact but needs a lock file that matches package.json; if it does not match, fall back to "npm install"
npm ci --no-audit --no-fund || npm install --no-audit --no-fund
npm run build
[ -f .output/server/index.mjs ] || { echo "Build did not produce .output/server/index.mjs - stop."; exit 1; }
npm run db:migrate

# Always recreate the pm2 process. "pm2 restart/reload" keeps the OLD start command of an existing process,
# which is how an old build (for example one that was started from a different folder) keeps being served.
pm2 delete sibamotor >/dev/null 2>&1 || true
pm2 start ecosystem.config.cjs
pm2 save

APP_PORT="$(grep -E '^PORT=' .env | head -1 | cut -d= -f2- | tr -d '[:space:]"' || true)"
APP_PORT="${APP_PORT:-3000}"
sleep 4
echo "== the app answers on port $APP_PORT:"
curl -s -o /dev/null -w "   http://127.0.0.1:$APP_PORT/login -> HTTP %{http_code}\n" "http://127.0.0.1:$APP_PORT/login" || echo "   NO ANSWER: run  pm2 logs sibamotor --lines 60"

# nginx must forward to the same port, otherwise the site shows an old program (or 502)
NGINX_PORTS="$(grep -rhoE 'proxy_pass +http://(127\.0\.0\.1|localhost):[0-9]+' /etc/nginx/sites-enabled/ /etc/nginx/conf.d/ 2>/dev/null | grep -oE '[0-9]+$' | sort -u | tr '\n' ' ' || true)"
echo "== nginx forwards to port(s): ${NGINX_PORTS:-unknown}"
case " $NGINX_PORTS " in
  *" $APP_PORT "*) echo "   OK: nginx and the app use the same port." ;;
  *) [ -n "$NGINX_PORTS" ] && echo "   WARNING: nginx does NOT forward to port $APP_PORT. Put  PORT=<one of: $NGINX_PORTS>  in .env and run  pm2 restart sibamotor --update-env  (or change proxy_pass in nginx)." ;;
esac
echo "Done. Check:  pm2 status   and   pm2 logs sibamotor --lines 40"
