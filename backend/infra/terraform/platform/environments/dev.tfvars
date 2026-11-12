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

# --- Servicios, entrada pública, correo y observabilidad ---
# Dev desechable: permite borrar buckets y ALB.
force_destroy_buckets   = true
alb_deletion_protection = false

# Entrada pública (ALB + CloudFront + WAF). Sin certificados no se crean.
# alb_certificate_arn        = "arn:aws:acm:us-east-1:111111111111:certificate/REEMPLAZAR"
# alb_hostname               = "origin-api.dev.example.com"
# cloudfront_certificate_arn = "arn:aws:acm:us-east-1:111111111111:certificate/REEMPLAZAR" # Debe estar en us-east-1.
# web_aliases                = ["app.dev.example.com"]
# api_aliases                = ["api.dev.example.com"]
# waf_block_mode             = false # Solo cuenta mientras afinas reglas.
# route53_zone_id            = "ZREEMPLAZAR"

# Correo (SES) y observabilidad (OpenObserve). Sin valor no se crean.
# ses_domain                    = "dev.example.com"
# observability_root_user_email = "REEMPLAZAR@example.com"

# Un microservicio nuevo es una entrada en este mapa.
services = {
  # tasks = {
  #   kind           = "fargate"
  #   image          = "111111111111.dkr.ecr.us-east-1.amazonaws.com/node-template-tasks:REEMPLAZAR"
  #   container_port = 3000
  #   path_patterns  = ["/tasks/*"]
  #   db_user        = "tasks"
  #   valkey_user    = "tasks"
  #   files_access   = true
  # }
  # notifications = {
  #   kind     = "lambda"
  #   queue    = "notifications-tasks-events"
  #   handler  = "lambda.handler"
  #   filename = "../../../dist/lambda/notifications.zip"
  #   ses_send = true
  # }
}
