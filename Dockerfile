# Build frontend
FROM node:20-slim AS frontend-build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
ENV VITE_BACKEND_URL=""
RUN NODE_OPTIONS="--max-old-space-size=4096" npm run build

# Build backend
FROM node:20-slim AS backend-build
WORKDIR /app
COPY backend/package*.json ./
RUN npm install
COPY backend/ .
RUN npm run build

# Final image
FROM node:20-slim
RUN apt-get update && apt-get install -y --no-install-recommends nginx supervisor && rm -rf /var/lib/apt/lists/*

# Copy frontend build
COPY --from=frontend-build /app/dist/client /usr/share/nginx/html

# Copy backend
WORKDIR /app/backend
COPY --from=backend-build /app/dist ./dist
COPY --from=backend-build /app/package*.json ./
RUN npm install --omit=dev

# Nginx config
RUN echo 'server { \
  listen 80; \
  location /api { proxy_pass http://localhost:5050; } \
  location / { root /usr/share/nginx/html; try_files $uri $uri/ /index.html; } \
}' > /etc/nginx/sites-available/default

# Supervisord config
RUN echo '[supervisord]\nnodaemon=true\n[program:nginx]\ncommand=nginx -g "daemon off;"\n[program:backend]\ncommand=node /app/backend/dist/index.js' > /etc/supervisor/conf.d/supervisord.conf

EXPOSE 80
CMD ["/usr/bin/supervisord"]
