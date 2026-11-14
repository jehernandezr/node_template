region       = "us-east-1"
environment  = "prod"
name_prefix  = "node-template-prod"
state_bucket = "node-template-prod-tfstate"

db_instance_class          = "db.r6g.large"
db_allocated_storage       = 100
db_max_allocated_storage   = 1000
db_multi_az                = true
db_read_replica_count      = 1
db_deletion_protection     = true
db_backup_retention_period = 14
db_skip_final_snapshot     = false

# Una base por shard de cada servicio y el catálogo. replication (por defecto) sirve a SagaType.MoveShard.
db_services = {
  identity = { shards = 2, catalog = "owner" }
  tasks    = { shards = 1, catalog = "read" }
}
db_enable_secret_rotation              = true
db_secret_rotation_days                = 30
db_secret_recovery_window_days         = 30
db_log_min_duration_statement_ms       = 500
db_performance_insights_retention_days = 7

valkey_services                 = ["identity", "tasks"]
valkey_snapshot_retention_limit = 7
valkey_cache_usage_limits = {
  data_storage_max_gb = 5
  ecpu_per_second_max = 10000
}

log_retention_days = 90
