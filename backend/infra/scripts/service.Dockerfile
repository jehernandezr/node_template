# One image per backend service, chosen with SERVICE. Build it from the repository root after
# `pnpm nx run <service>:build`, so backend/dist/<service> holds the bundles. The base image is pinned
# by digest; its Node version is the one in .nvmrc. The lambda stage is the Lambda package of the same
# service: `--target lambda --output type=local,dest=<dir>` writes the bundles and node_modules to zip.
FROM node:24.22.2-alpine3.23@sha256:0efee1e068d21f6edcab7fa8c962fc4ecd50d4e28727bc23963379b63ee318ab AS base

FROM base AS dependencies
WORKDIR /workspace
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json backend/
RUN corepack enable \
  && pnpm --filter @node-template/backend deploy --legacy --prod --frozen-lockfile --ignore-scripts /deploy

FROM scratch AS lambda
ARG SERVICE
COPY --from=dependencies /deploy/node_modules /node_modules
COPY backend/dist/${SERVICE}/ /

FROM base
ARG SERVICE
WORKDIR /app
ENV NODE_ENV=production
COPY --from=dependencies /deploy/node_modules ./node_modules
COPY backend/dist/${SERVICE}/ ./
USER node
CMD ["node", "main.mjs"]
