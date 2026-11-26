-- Local initialization of the simulated region B (postgres-b).
-- Shards only: the catalog lives in the main region (postgres). It runs only when the
-- postgres-b-data volume is empty.

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
