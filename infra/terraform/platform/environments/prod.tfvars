# Entorno prod. Valores de ejemplo: revísalos antes de usarlos.
# Uso: terraform plan -var-file=environments/prod.tfvars

region      = "us-east-1"
environment = "prod"
name_prefix = "node-template-prod"
vpc_cidr    = "10.20.0.0/16"

db_engine_version          = "17"
db_instance_class          = "db.r6g.large"
db_allocated_storage       = 100
db_max_allocated_storage   = 1000
db_multi_az                = true
db_read_replica_count      = 1
db_deletion_protection     = true
db_backup_retention_period = 14
db_skip_final_snapshot     = false
db_name                    = "platform"
db_username                = "platform_admin"

valkey_snapshot_retention_limit = 7
valkey_cache_usage_limits = {
  data_storage_max_gb = 5
  ecpu_per_second_max = 10000
}

# Ruta real a la topología exportada por libs/platform/messaging.
topology_file = "../examples/topology.example.json"

# Requerido en prod para recibir alarmas de DLQ.
# alarm_topic_arn = "arn:aws:sns:us-east-1:222222222222:REEMPLAZAR"
