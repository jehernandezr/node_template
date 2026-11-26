-- Databases of the local smoke stack (smoke.compose.yml): one catalog and two shards per service, each with the
-- extensions provisioning creates. The smoke runner registers the shards once the catalog is migrated.

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
