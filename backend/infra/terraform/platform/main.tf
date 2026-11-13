provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Environment = var.environment
      NamePrefix  = var.name_prefix
      ManagedBy   = "terraform"
    }
  }
}

# CloudFront, su WAF y su certificado ACM solo existen en us-east-1.
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"

  default_tags {
    tags = {
      Environment = var.environment
      NamePrefix  = var.name_prefix
      ManagedBy   = "terraform"
    }
  }
}

locals {
  # Acepta ruta absoluta o relativa a la raíz platform.
  topology_file = startswith(var.topology_file, "/") ? var.topology_file : abspath("${path.root}/${var.topology_file}")

  create_alarm_topic = var.alarm_email != null
  alarm_topic_arn    = local.create_alarm_topic ? aws_sns_topic.alarms[0].arn : var.alarm_topic_arn
}

# En prod las alarmas de DLQ y RDS deben tener destino.
resource "terraform_data" "alarm_check" {
  lifecycle {
    precondition {
      condition     = var.environment != "prod" || local.alarm_topic_arn != null
      error_message = "En prod define alarm_email o alarm_topic_arn: las alarmas de DLQ y RDS necesitan destino."
    }
  }
}

# Tópico de alarmas propio cuando se indica un correo. La suscripción por correo
# queda pendiente hasta que el destinatario confirme el mensaje de AWS.
resource "aws_kms_key" "alarms" {
  count = local.create_alarm_topic ? 1 : 0

  description             = "Cifrado del tópico de alarmas de ${var.name_prefix}"
  enable_key_rotation     = true
  deletion_window_in_days = 30

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EnableIamPolicies"
        Effect    = "Allow"
        Principal = { AWS = "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:root" }
        Action    = "kms:*"
        Resource  = "*"
      },
      {
        Sid       = "AllowCloudWatchAlarms"
        Effect    = "Allow"
        Principal = { Service = "cloudwatch.amazonaws.com" }
        Action    = ["kms:Decrypt", "kms:GenerateDataKey*"]
        Resource  = "*"
        Condition = { StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id } }
      },
    ]
  })
}

resource "aws_kms_alias" "alarms" {
  count = local.create_alarm_topic ? 1 : 0

  name          = "alias/${var.name_prefix}-alarms"
  target_key_id = aws_kms_key.alarms[0].key_id
}

resource "aws_sns_topic" "alarms" {
  count = local.create_alarm_topic ? 1 : 0

  name              = "${var.name_prefix}-alarms"
  kms_master_key_id = aws_kms_key.alarms[0].arn
}

resource "aws_sns_topic_policy" "alarms" {
  count = local.create_alarm_topic ? 1 : 0

  arn = aws_sns_topic.alarms[0].arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudWatchAlarms"
      Effect    = "Allow"
      Principal = { Service = "cloudwatch.amazonaws.com" }
      Action    = "sns:Publish"
      Resource  = aws_sns_topic.alarms[0].arn
      Condition = { StringEquals = { "aws:SourceAccount" = data.aws_caller_identity.current.account_id } }
    }]
  })
}

resource "aws_sns_topic_subscription" "alarms_email" {
  count = local.create_alarm_topic ? 1 : 0

  topic_arn = aws_sns_topic.alarms[0].arn
  protocol  = "email"
  endpoint  = var.alarm_email
}

data "aws_prefix_list" "s3" {
  name = "com.amazonaws.${var.region}.s3"
}

data "aws_prefix_list" "dynamodb" {
  name = "com.amazonaws.${var.region}.dynamodb"
}

data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

module "network" {
  source = "../modules/network"

  name_prefix              = var.name_prefix
  vpc_cidr                 = var.vpc_cidr
  egress                   = var.egress
  flow_logs_retention_days = var.flow_logs_retention_days
  flow_logs_traffic_type   = var.flow_logs_traffic_type
}

# Security group que los servicios (Lambda, Fargate) adjuntan para llegar a
# RDS Proxy, Valkey, endpoints y S3. Las raíces de servicio llegan en F12.
resource "aws_security_group" "clients" {
  name        = "${var.name_prefix}-clients"
  description = "Clientes de la plataforma: servicios que usan RDS Proxy, Valkey y AWS"
  vpc_id      = module.network.vpc_id
}

resource "aws_vpc_security_group_egress_rule" "clients_to_proxy" {
  security_group_id            = aws_security_group.clients.id
  referenced_security_group_id = module.rds.proxy_security_group_id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  description                  = "Hacia RDS Proxy"
}

resource "aws_vpc_security_group_egress_rule" "clients_to_valkey" {
  security_group_id            = aws_security_group.clients.id
  referenced_security_group_id = module.valkey.security_group_id
  from_port                    = 6379
  to_port                      = 6380
  ip_protocol                  = "tcp"
  description                  = "Hacia Valkey"
}

resource "aws_vpc_security_group_egress_rule" "clients_to_endpoints" {
  security_group_id            = aws_security_group.clients.id
  referenced_security_group_id = module.network.endpoint_security_group_id
  from_port                    = 443
  to_port                      = 443
  ip_protocol                  = "tcp"
  description                  = "HTTPS hacia endpoints de VPC"
}

# Salida a Internet (Claude API, APNs, FCM, pagos) por el NAT de las subredes privadas.
# Solo HTTPS. Las subredes de datos no tienen ruta a Internet (ADR 0016).
# Salida HTTPS a Internet por NAT, decidida en el ADR 0016.
# trivy:ignore:AVD-AWS-0104
resource "aws_vpc_security_group_egress_rule" "clients_to_internet" {
  count = var.egress == "none" ? 0 : 1

  security_group_id = aws_security_group.clients.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  description       = "HTTPS hacia Internet por NAT"
}

resource "aws_vpc_security_group_egress_rule" "clients_to_dynamodb" {
  security_group_id = aws_security_group.clients.id
  prefix_list_id    = data.aws_prefix_list.dynamodb.id
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  description       = "HTTPS hacia DynamoDB por endpoint gateway"
}

resource "aws_vpc_security_group_egress_rule" "clients_to_s3" {
  security_group_id = aws_security_group.clients.id
  prefix_list_id    = data.aws_prefix_list.s3.id
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  description       = "HTTPS hacia S3 por endpoint gateway"
}

module "rds" {
  source = "../modules/rds-postgres"

  name_prefix                = var.name_prefix
  vpc_id                     = module.network.vpc_id
  data_subnet_ids            = module.network.data_subnet_ids
  endpoint_security_group_id = module.network.endpoint_security_group_id
  allowed_security_group_ids = [aws_security_group.clients.id]

  service_users                       = var.db_service_users
  enable_secret_rotation              = var.db_enable_secret_rotation
  secret_rotation_days                = var.db_secret_rotation_days
  secret_recovery_window_days         = var.db_secret_recovery_window_days
  log_min_duration_statement_ms       = var.db_log_min_duration_statement_ms
  performance_insights_retention_days = var.db_performance_insights_retention_days
  alarm_topic_arn                     = local.alarm_topic_arn

  engine_version          = var.db_engine_version
  instance_class          = var.db_instance_class
  allocated_storage       = var.db_allocated_storage
  max_allocated_storage   = var.db_max_allocated_storage
  multi_az                = var.db_multi_az
  read_replica_count      = var.db_read_replica_count
  deletion_protection     = var.db_deletion_protection
  backup_retention_period = var.db_backup_retention_period
  skip_final_snapshot     = var.db_skip_final_snapshot
  db_name                 = var.db_name
  db_username             = var.db_username
}

module "valkey" {
  source = "../modules/valkey"

  name_prefix                = var.name_prefix
  vpc_id                     = module.network.vpc_id
  subnet_ids                 = module.network.data_subnet_ids
  allowed_security_group_ids = [aws_security_group.clients.id]
  users                      = var.valkey_users
  snapshot_retention_limit   = var.valkey_snapshot_retention_limit
  cache_usage_limits         = var.valkey_cache_usage_limits
}

module "messaging" {
  source = "../modules/messaging"

  name_prefix       = var.name_prefix
  topology_file     = local.topology_file
  alarm_topic_arn   = local.alarm_topic_arn
  max_receive_count = var.messaging_max_receive_count

  depends_on = [terraform_data.alarm_check]
}
