-- Local PostgreSQL initialization, for the development stack (backend/docker-compose.yml) and the local smoke stack
-- (smoke.compose.yml). It runs only when the PostgreSQL volume is empty.
-- To run it again: docker compose down -v && docker compose up -d
--
-- Each service has its own catalog (<service>_catalog: its shard directory, shard map and catalog tables; identity's
-- also holds the global indexes) and two logical shards, on purpose, so routing is exercised locally (ADR 0042).
-- Every database gets the extensions the data stack bootstrap creates.

CREATE DATABASE identity_catalog;
\c identity_catalog
CREATE EXTENSION IF NOT EXISTS vector;
CREATE DATABASE identity_shard_0;
\c identity_shard_0
CREATE EXTENSION IF NOT EXISTS vector;
CREATE DATABASE identity_shard_1;
\c identity_shard_1
CREATE EXTENSION IF NOT EXISTS vector;

CREATE DATABASE tasks_catalog;
\c tasks_catalog
CREATE EXTENSION IF NOT EXISTS vector;
CREATE DATABASE tasks_shard_0;
\c tasks_shard_0
CREATE EXTENSION IF NOT EXISTS vector;
CREATE DATABASE tasks_shard_1;
\c tasks_shard_1
CREATE EXTENSION IF NOT EXISTS vector;

CREATE DATABASE notifications_catalog;
\c notifications_catalog
CREATE EXTENSION IF NOT EXISTS vector;
CREATE DATABASE notifications_shard_0;
\c notifications_shard_0
CREATE EXTENSION IF NOT EXISTS vector;
CREATE DATABASE notifications_shard_1;
\c notifications_shard_1
CREATE EXTENSION IF NOT EXISTS vector;

CREATE DATABASE reports_catalog;
\c reports_catalog
CREATE EXTENSION IF NOT EXISTS vector;
CREATE DATABASE reports_shard_0;
\c reports_shard_0
CREATE EXTENSION IF NOT EXISTS vector;
CREATE DATABASE reports_shard_1;
\c reports_shard_1
CREATE EXTENSION IF NOT EXISTS vector;

CREATE DATABASE billing_catalog;
\c billing_catalog
CREATE EXTENSION IF NOT EXISTS vector;
CREATE DATABASE billing_shard_0;
\c billing_shard_0
CREATE EXTENSION IF NOT EXISTS vector;
CREATE DATABASE billing_shard_1;
\c billing_shard_1
CREATE EXTENSION IF NOT EXISTS vector;
