FROM node:22-alpine AS build
RUN corepack enable
WORKDIR /app
COPY package.json pnpm-workspace.yaml ./
COPY web/package.json web/
RUN pnpm install --frozen-lockfile || pnpm install
COPY web web
RUN pnpm -C web build

FROM node:22-alpine
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production
ENV NUXT_SQLITE_DATABASE_PATH=/data/db.sqlite
COPY --from=build /app/web/.output /app/.output
COPY --from=build /app/web/server/database/migrations /app/migrations
VOLUME /data
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
