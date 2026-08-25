FROM node:24-bookworm-slim AS deps

WORKDIR /app

COPY package*.json ./
COPY shared/dist ./shared/dist
RUN npm ci --omit=dev --legacy-peer-deps

FROM node:24-bookworm-slim

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./
COPY shared/dist ./shared/dist
COPY scripts/resolve-shared.mjs ./scripts/resolve-shared.mjs
COPY scripts/resolve-shared-hooks.mjs ./scripts/resolve-shared-hooks.mjs
COPY graphql/dist ./graphql/dist

CMD ["node", "--import", "./scripts/resolve-shared.mjs", "graphql/dist/src/index.js"]
