# Entorno dev. Valores de ejemplo: revísalos antes de usarlos.
# Uso: terraform plan -var-file=environments/dev.tfvars

region      = "us-east-1"
environment = "dev"
name_prefix = "node-template-dev"
vpc_cidr    = "10.10.0.0/16"

db_engine_version          = "17"
db_instance_class          = "db.t4g.medium"
db_allocated_storage       = 20
db_max_allocated_storage   = 100
db_multi_az                = false
db_read_replica_count      = 0
db_deletion_protection     = false # Permite borrar en dev.
db_backup_retention_period = 7
db_skip_final_snapshot     = true # Sin snapshot final en dev.
db_name                    = "platform"
db_username                = "platform_admin"

valkey_snapshot_retention_limit = 0
valkey_cache_usage_limits = {
  data_storage_max_gb = 1
  ecpu_per_second_max = 1000
}

# Ruta a la topología exportada por backend/libs/platform/messaging.
topology_file = "../examples/topology.example.json"

# Red: un solo NAT gateway para abaratar (ADR 0016).
egress                   = "single_nat"
flow_logs_retention_days = 14
flow_logs_traffic_type   = "REJECT"

db_service_users = [
  { name = "identity" },
  { name = "tasks" },
  { name = "replication", create_schema = false, rds_replication = true },
]
db_secret_recovery_window_days = 7

valkey_users = {
  identity = "on ~* &* +@all -@dangerous"
  tasks    = "on ~* &* +@all -@dangerous"
}

# alarm_email = "REEMPLAZAR@example.com"
# alarm_topic_arn = "arn:aws:sns:us-east-1:111111111111:REEMPLAZAR"
