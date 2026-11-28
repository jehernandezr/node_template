region       = "us-east-1"
state_bucket = "node-template-dev-tfstate"

db_instance_class          = "db.t4g.medium"
db_allocated_storage       = 20
db_max_allocated_storage   = 100
db_multi_az                = false
db_read_replica_count      = 0
db_deletion_protection     = false # Allows deletion in dev.
db_backup_retention_period = 7
db_skip_final_snapshot     = true # No final snapshot in dev.

# One catalog and one database per shard of each service, same as backend/infra/local/postgres/init.sql.
db_services = {
  identity      = { shards = 2 }
  tasks         = { shards = 1 }
  notifications = { shards = 2 }
  reports       = { shards = 2 }
  billing       = { shards = 2 }
}
db_secret_recovery_window_days = 0

# One Valkey user per service, limited to its <service>:* keys.
valkey_services                 = ["identity", "tasks", "notifications", "reports", "billing"]
valkey_snapshot_retention_limit = 0

log_retention_days = 14
