region       = "us-east-1"
state_bucket = "node-template-prod-tfstate"

db_instance_class          = "db.r6g.large"
db_allocated_storage       = 100
db_max_allocated_storage   = 1000
db_multi_az                = true
db_read_replica_count      = 1
db_deletion_protection     = true
db_backup_retention_period = 35
db_skip_final_snapshot     = false

# One database per shard of each service plus the catalog. replication (the default) serves SagaType.MoveShard.
db_services = {
  identity      = { shards = 2 }
  tasks         = { shards = 2 }
  notifications = { shards = 2 }
  reports       = { shards = 2 }
  billing       = { shards = 2 }
}
db_enable_secret_rotation              = true
db_secret_rotation_days                = 30
db_secret_recovery_window_days         = 30
db_log_min_duration_statement_ms       = 500
db_performance_insights_retention_days = 7

valkey_services                 = ["identity", "tasks", "notifications", "reports", "billing"]
valkey_snapshot_retention_limit = 7
valkey_cache_usage_limits = {
  data_storage_max_gb = 5
  ecpu_per_second_max = 10000
}

log_retention_days = 90
