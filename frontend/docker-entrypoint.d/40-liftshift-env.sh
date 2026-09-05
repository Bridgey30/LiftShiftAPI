#!/bin/sh
# nginx:alpine executes scripts in /docker-entrypoint.d/ on startup.
# Generates /usr/share/nginx/html/env.js so one image works in every
# environment without rebuilding for VITE_BACKEND_URL.
# BACKEND_URL="" (default) = same-origin /api via Nginx proxy (recommended).
# Set BACKEND_URL=https://your-backend.onrender.com to call a hosted backend directly.
set -eu

TARGET="/usr/share/nginx/html/env.js"
BACKEND_URL="${BACKEND_URL:-}"

# Escape backslashes and double quotes for safe JS string embedding.
ESCAPED=$(printf '%s' "$BACKEND_URL" | sed -e 's/\\/\\\\/g' -e 's/"/\\"/g')

cat > "$TARGET" <<EOF
window.__LIFTSHIFT_ENV__ = window.__LIFTSHIFT_ENV__ || {};
window.__LIFTSHIFT_ENV__.VITE_BACKEND_URL = "${ESCAPED}";
EOF
