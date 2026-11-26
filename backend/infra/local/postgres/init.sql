-- Local PostgreSQL initialization.
-- It runs only when the postgres-data volume is empty.
-- To run it again: docker compose down -v && docker compose up -d

-- Global catalog: tenant -> region -> group directory, shard map, global indexes.
CREATE DATABASE catalog;
\c catalog
CREATE EXTENSION IF NOT EXISTS vector;

-- Two logical identity shards on purpose: routing is exercised locally.
CREATE DATABASE identity_shard_0;
\c identity_shard_0
CREATE EXTENSION IF NOT EXISTS vector;

CREATE DATABASE identity_shard_1;
\c identity_shard_1
CREATE EXTENSION IF NOT EXISTS vector;

CREATE DATABASE tasks_shard_0;
\c tasks_shard_0
CREATE EXTENSION IF NOT EXISTS vector;

CREATE DATABASE tasks_shard_1;
\c tasks_shard_1
CREATE EXTENSION IF NOT EXISTS vector;

CREATE DATABASE notifications_shard_0;
\c notifications_shard_0
CREATE EXTENSION IF NOT EXISTS vector;

CREATE DATABASE notifications_shard_1;
\c notifications_shard_1
CREATE EXTENSION IF NOT EXISTS vector;

CREATE DATABASE reports_shard_0;
\c reports_shard_0
CREATE EXTENSION IF NOT EXISTS vector;

CREATE DATABASE reports_shard_1;
\c reports_shard_1
CREATE EXTENSION IF NOT EXISTS vector;

CREATE DATABASE billing_shard_0;
\c billing_shard_0
CREATE EXTENSION IF NOT EXISTS vector;

CREATE DATABASE billing_shard_1;
\c billing_shard_1
CREATE EXTENSION IF NOT EXISTS vector;
