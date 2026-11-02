# EduX frontend production image.
# Multi-stage: build the Vite SPA, then serve it with nginx (which also proxies /v1).

# --- Stage 1: build ---
# Node 22 matches the audited local toolchain.
FROM node:22-alpine AS build
WORKDIR /app

# Keep dependency installation cacheable when only application sources change.
COPY package.json package-lock.json ./
RUN npm ci

# Build the static bundle. .env.production supplies VITE_API_BASE_URL=/v1
COPY . .
RUN npm run build

# --- Stage 2: serve ---
FROM nginx:1.27-alpine AS runtime

# Replace the default site with our SPA + API-proxy config.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
