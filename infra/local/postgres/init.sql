-- Inicialización local de PostgreSQL.
-- Se ejecuta solo cuando el volumen postgres-data está vacío.
-- Para volver a ejecutarlo: docker compose down -v && docker compose up -d

-- Catálogo global: directorio tenant -> región -> grupo, mapa de shards, índices globales.
CREATE DATABASE catalog;
\c catalog
CREATE EXTENSION IF NOT EXISTS vector;

-- Dos shards lógicos de identity a propósito: el enrutamiento se ejercita en local.
CREATE DATABASE identity_shard_0;
\c identity_shard_0
CREATE EXTENSION IF NOT EXISTS vector;

CREATE DATABASE identity_shard_1;
\c identity_shard_1
CREATE EXTENSION IF NOT EXISTS vector;

CREATE DATABASE tasks_shard_0;
\c tasks_shard_0
CREATE EXTENSION IF NOT EXISTS vector;
