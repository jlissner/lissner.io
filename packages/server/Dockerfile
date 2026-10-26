FROM node:24-bookworm-slim AS deps

RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/graphql/package.json ./packages/graphql/
COPY packages/pics/package.json ./packages/pics/
COPY packages/db/package.json ./packages/db/
RUN npm ci --omit=dev --legacy-peer-deps -w @lissner/server

FROM node:24-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/shared/dist ./packages/shared/dist
COPY packages/server/dist ./packages/server/dist

CMD ["npm", "run", "start", "-w", "@lissner/server"]
