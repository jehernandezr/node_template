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

locals {
  # Acepta ruta absoluta o relativa a la raíz platform.
  topology_file = startswith(var.topology_file, "/") ? var.topology_file : abspath("${path.root}/${var.topology_file}")
}

data "aws_prefix_list" "s3" {
  name = "com.amazonaws.${var.region}.s3"
}

module "network" {
  source = "../modules/network"

  name_prefix = var.name_prefix
  vpc_cidr    = var.vpc_cidr
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
  private_subnet_ids         = module.network.private_subnet_ids
  endpoint_security_group_id = module.network.endpoint_security_group_id
  allowed_security_group_ids = [aws_security_group.clients.id]

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
  subnet_ids                 = module.network.private_subnet_ids
  allowed_security_group_ids = [aws_security_group.clients.id]
  snapshot_retention_limit   = var.valkey_snapshot_retention_limit
  cache_usage_limits         = var.valkey_cache_usage_limits
}

module "messaging" {
  source = "../modules/messaging"

  name_prefix     = var.name_prefix
  topology_file   = local.topology_file
  alarm_topic_arn = var.alarm_topic_arn
}
