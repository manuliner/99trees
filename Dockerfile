FROM node:22-alpine AS build
RUN apk add --no-cache python3 make g++
RUN corepack enable
WORKDIR /app

ARG APP_VERSION=0.0.0
ARG BUILD_TIME=

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY web/package.json web/
RUN pnpm install --frozen-lockfile

COPY web web

RUN sh -c '\
  EFFECTIVE="${APP_VERSION}"; \
  if [ -z "${EFFECTIVE}" ] || [ "${EFFECTIVE}" = "0.0.0" ]; then \
    EFFECTIVE=$(node -p "require(\"./web/package.json\").version"); \
  fi; \
  mkdir -p web/public; \
  if [ -z "${BUILD_TIME}" ]; then \
    BUILD_TIME_VALUE=$(date -u +"%Y-%m-%dT%H:%M:%SZ"); \
  else \
    BUILD_TIME_VALUE="${BUILD_TIME}"; \
  fi; \
  echo "{\"version\":\"${EFFECTIVE}\",\"buildTime\":\"${BUILD_TIME_VALUE}\"}" > web/public/version.json; \
  export NUXT_APP_VERSION="${EFFECTIVE}"; \
  pnpm -C web run build'

FROM node:22-alpine
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production
ENV NUXT_SQLITE_DATABASE_PATH=/data/db.sqlite
COPY --from=build /app/web/.output /app/.output
COPY --from=build /app/web/server/database/migrations /app/migrations
COPY --from=build /app/web/public/version.json ./public/version.json
VOLUME /data
EXPOSE 3000
CMD ["node", ".output/server/index.mjs"]
