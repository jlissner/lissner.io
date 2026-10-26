FROM node:24-bookworm-slim AS deps

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/server/package.json ./packages/server/
COPY packages/graphql/package.json ./packages/graphql/
COPY packages/pics/package.json ./packages/pics/
COPY packages/db/package.json ./packages/db/
RUN npm ci --omit=dev --legacy-peer-deps -w @lissner/graphql

FROM node:24-bookworm-slim

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY packages/graphql/package.json ./packages/graphql/
COPY packages/shared/dist ./packages/shared/dist
COPY packages/graphql/dist ./packages/graphql/dist

CMD ["npm", "run", "start", "-w", "@lissner/graphql"]
