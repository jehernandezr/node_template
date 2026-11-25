# Single image for the backend services. The service is chosen at build time with SERVICE, and
# NODE_VERSION comes from .nvmrc so the image and development use the same version.
ARG NODE_VERSION
FROM node:${NODE_VERSION}-alpine

ARG SERVICE
WORKDIR /app
COPY backend/dist/${SERVICE}/ ./

USER node
ENV NODE_ENV=production
# Workers and real time override this command in their Fargate task definition.
CMD ["node", "main.js"]
