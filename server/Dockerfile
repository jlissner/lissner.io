FROM node:24-bookworm-slim AS deps

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
COPY shared/dist ./shared/dist
COPY scripts/resolve-shared.mjs ./scripts/resolve-shared.mjs
COPY scripts/resolve-shared-hooks.mjs ./scripts/resolve-shared-hooks.mjs
RUN npm ci --omit=dev --legacy-peer-deps

FROM node:24-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY shared/dist ./shared/dist
COPY scripts/resolve-shared.mjs ./scripts/resolve-shared.mjs
COPY scripts/resolve-shared-hooks.mjs ./scripts/resolve-shared-hooks.mjs
COPY server/dist ./server/dist

CMD ["node", "--import", "./scripts/resolve-shared.mjs", "server/dist/index.js"]
