FROM node:20-alpine AS deps
WORKDIR /repo

# Install from the monorepo root so workspaces + tsconfig.base.json are available.
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /repo
COPY --from=deps /repo/node_modules ./node_modules
COPY . .
RUN npm run prisma:generate -w apps/api
RUN npm run build -w apps/api

FROM node:20-alpine AS runner
WORKDIR /repo/apps/api
ENV NODE_ENV=production
RUN apk add --no-cache openssl

# Node will resolve deps from /repo/node_modules.
COPY --from=build /repo/node_modules /repo/node_modules
COPY --from=build /repo/apps/api/dist ./dist
COPY --from=build /repo/apps/api/prisma ./prisma

EXPOSE 3001
CMD ["node", "dist/src/main.js"]
