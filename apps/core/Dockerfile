# apps/core — single Node process that serves the API + built SPA.
# The runtime uses tsx + cross-env (devDependencies), so we keep a full install.
FROM node:22-alpine

WORKDIR /app

# Install deps first for layer caching.
COPY package.json package-lock.json ./
RUN npm ci

# Build the client (vite) + typecheck client & server.
COPY . .
# VITE_WEB_URL is inlined at build time — pass it with --build-arg.
ARG VITE_WEB_URL=https://b1overs.com
ENV VITE_WEB_URL=$VITE_WEB_URL
RUN npm run build

ENV NODE_ENV=production \
    PORT=3001 \
    BOU_DATA_DIR=/data

EXPOSE 3001
VOLUME ["/data"]

# Liveness: the API port is accepting connections (busybox nc).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD nc -z 127.0.0.1 "${PORT}" || exit 1

CMD ["npm", "start"]
