region       = "us-east-1"
state_bucket = "node-template-staging-tfstate"

# Same shape as prod (Multi-AZ and replica) to test promotion, with less capacity.
db_instance_class          = "db.t4g.large"
db_allocated_storage       = 50
db_max_allocated_storage   = 200
db_multi_az                = true
db_read_replica_count      = 1
db_deletion_protection     = true
db_backup_retention_period = 14
db_skip_final_snapshot     = false

db_services = {
  identity      = { shards = 2 }
  tasks         = { shards = 2 }
  notifications = { shards = 2 }
  reports       = { shards = 2 }
  billing       = { shards = 2 }
}
db_secret_recovery_window_days = 7

valkey_services                 = ["identity", "tasks", "notifications", "reports", "billing"]
valkey_snapshot_retention_limit = 1
valkey_cache_usage_limits = {
  data_storage_max_gb = 2
  ecpu_per_second_max = 5000
}

log_retention_days = 30
