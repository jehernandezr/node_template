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

# Topología real exportada por backend/libs/platform/messaging (Topology.toJSON()).
# El pipeline la genera en backend/dist/topology/topology.json antes de planear.
# No apuntes a examples/: el ejemplo solo sirve para validar.
topology_file = "../../../dist/topology/topology.json"

# Red: un NAT gateway por AZ para las subredes privadas de aplicación (ADR 0016).
egress                   = "per_az_nat"
flow_logs_retention_days = 365
flow_logs_traffic_type   = "ALL"

# Base de datos: un usuario por servicio, nunca el maestro. replication sirve a SagaType.MoveShard.
db_service_users = [
  { name = "identity" },
  { name = "tasks" },
  { name = "replication", create_schema = false, rds_replication = true },
]
db_enable_secret_rotation              = true
db_secret_rotation_days                = 30
db_secret_recovery_window_days         = 30
db_log_min_duration_statement_ms       = 500
db_performance_insights_retention_days = 7

# Valkey: un usuario IAM por servicio.
valkey_users = {
  identity = "on ~* &* +@all -@dangerous"
  tasks    = "on ~* &* +@all -@dangerous"
}

# Alarmas de DLQ y RDS. En prod es obligatorio uno de los dos.
# Con alarm_email se crea el tópico SNS y el destinatario confirma la suscripción.
# Con alarm_topic_arn se usa un tópico existente.
alarm_email = "REEMPLAZAR@example.com"
# alarm_topic_arn = "arn:aws:sns:us-east-1:222222222222:REEMPLAZAR"

# --- Servicios, entrada pública, correo y observabilidad ---
# Entrada pública (ALB + CloudFront + WAF). Sin certificados no se crean.
# alb_certificate_arn        = "arn:aws:acm:us-east-1:222222222222:certificate/REEMPLAZAR"
# alb_hostname               = "origin-api.example.com"
# cloudfront_certificate_arn = "arn:aws:acm:us-east-1:222222222222:certificate/REEMPLAZAR" # Debe estar en us-east-1.
# web_aliases                = ["app.example.com"]
# api_aliases                = ["api.example.com"]
# route53_zone_id            = "ZREEMPLAZAR"

# Correo (SES) y observabilidad (OpenObserve). Sin valor no se crean.
# ses_domain                    = "example.com"
# observability_root_user_email = "REEMPLAZAR@example.com"

# Un microservicio nuevo es una entrada en este mapa.
services = {
  # tasks = {
  #   kind           = "fargate"
  #   image          = "222222222222.dkr.ecr.us-east-1.amazonaws.com/node-template-tasks:REEMPLAZAR"
  #   container_port = 3000
  #   path_patterns  = ["/tasks/*"]
  #   min_capacity   = 2
  #   db_user        = "tasks"
  #   valkey_user    = "tasks"
  # }
  # reports = {
  #   kind           = "fargate" # Worker: sin rutas, escala por cola.
  #   image          = "222222222222.dkr.ecr.us-east-1.amazonaws.com/node-template-reports:REEMPLAZAR"
  #   queue          = "reports-commands"
  #   min_capacity   = 0
  #   spot           = true
  #   scale_on_queue = {}
  # }
}
