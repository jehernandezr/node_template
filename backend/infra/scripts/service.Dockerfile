# Imagen única para los servicios de backend. El servicio se elige al construir con SERVICE, y
# NODE_VERSION sale de .nvmrc para que la imagen y el desarrollo usen la misma versión.
ARG NODE_VERSION
FROM node:${NODE_VERSION}-alpine

ARG SERVICE
WORKDIR /app
COPY backend/dist/${SERVICE}/ ./

USER node
ENV NODE_ENV=production
# Los workers y el tiempo real cambian este comando en la definición de su tarea de Fargate.
CMD ["node", "main.js"]
