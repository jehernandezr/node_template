-- Inicialización local de la región B simulada (postgres-b).
-- Solo shards: el catálogo vive en la región principal (postgres). Se ejecuta solo cuando el volumen
-- postgres-b-data está vacío.

CREATE DATABASE identity_shard_b0;
\c identity_shard_b0
CREATE EXTENSION IF NOT EXISTS vector;

CREATE DATABASE tasks_shard_b0;
\c tasks_shard_b0
CREATE EXTENSION IF NOT EXISTS vector;

CREATE DATABASE notifications_shard_b0;
\c notifications_shard_b0
CREATE EXTENSION IF NOT EXISTS vector;

CREATE DATABASE reports_shard_b0;
\c reports_shard_b0
CREATE EXTENSION IF NOT EXISTS vector;

CREATE DATABASE billing_shard_b0;
\c billing_shard_b0
CREATE EXTENSION IF NOT EXISTS vector;
