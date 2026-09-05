# LiftShift frontend — build static bundle, serve via Nginx.
# Build context is the repo root (needs package.json + vite.config.ts + frontend/).
FROM node:22-slim AS build

WORKDIR /app

# Build-time config. VITE_* values are baked into the bundle by Vite.
# Default VITE_BACKEND_URL is empty = same-origin /api (Nginx proxies to backend).
# Override at build time only if the browser must call a hosted backend directly.
# NOTE: analytics/tracking build args are intentionally absent — self-host
# images ship tracking-free (see strip step below), so keys can't be baked in.
ARG VITE_BACKEND_URL=
ARG VITE_BASE_PATH=/
ARG BASE_ASSETS=/

ENV VITE_BACKEND_URL=$VITE_BACKEND_URL \
    VITE_BASE_PATH=$VITE_BASE_PATH \
    BASE_ASSETS=$BASE_ASSETS \
    VITE_ANALYTICS_DISABLED=1 \
    VITE_GA_MEASUREMENT_ID= \
    VITE_PUBLIC_POSTHOG_KEY= \
    VITE_PUBLIC_POSTHOG_HOST= \
    VITE_PUBLIC_POSTHOG_UI_HOST=

COPY package.json package-lock.json ./
COPY tsconfig.json vite.config.ts ./
COPY frontend ./frontend
RUN npm ci && npm run build

# Self-host strip: remove owner tracking/monetization artifacts so they can
# never ship in community images. Hosted deploys (Netlify/Pages/Render) build
# from source and are unaffected.
RUN rm -f dist/client/ads.txt \
  && for f in $(grep -rl "impact-site-verification" dist/client --include="*.html" || true); do grep -v "impact-site-verification" "$f" > "$f.tmp" || [ $? -eq 1 ]; mv "$f.tmp" "$f"; done \
  && test ! -e dist/client/ads.txt \
  && ! grep -rq "impact-site-verification" dist/client --include="*.html" \
  && echo "self-host strip OK: no ads.txt, no affiliate meta"

FROM nginx:alpine

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY frontend/docker-entrypoint.d/ /docker-entrypoint.d/
COPY --from=build /app/dist/client /usr/share/nginx/html

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:80/ || exit 1
