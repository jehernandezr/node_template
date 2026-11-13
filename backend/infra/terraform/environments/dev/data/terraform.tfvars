region       = "us-east-1"
environment  = "dev"
name_prefix  = "node-template-dev"
state_bucket = "node-template-dev-tfstate"

db_instance_class          = "db.t4g.medium"
db_allocated_storage       = 20
db_max_allocated_storage   = 100
db_multi_az                = false
db_read_replica_count      = 0
db_deletion_protection     = false # Permite borrar en dev.
db_backup_retention_period = 7
db_skip_final_snapshot     = true # Sin snapshot final en dev.

# Una base por shard de cada servicio y el catálogo, igual que backend/infra/local/postgres/init.sql.
db_services = {
  identity = { shards = 2, catalog = "owner" }
  tasks    = { shards = 1, catalog = "read" }
}
db_secret_recovery_window_days = 0

# Un usuario Valkey por servicio, limitado a sus llaves <servicio>:*.
valkey_services                 = ["identity", "tasks"]
valkey_snapshot_retention_limit = 0

log_retention_days = 14
