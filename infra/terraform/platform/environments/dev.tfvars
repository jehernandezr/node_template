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

# Ruta a la topología exportada por libs/platform/messaging.
topology_file = "../examples/topology.example.json"

# alarm_topic_arn = "arn:aws:sns:us-east-1:111111111111:REEMPLAZAR"
