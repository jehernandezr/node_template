data "aws_region" "current" {}

locals {
  master_secret_arn = aws_db_instance.this.master_user_secret[0].secret_arn
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.name_prefix}-db"
  subnet_ids = var.private_subnet_ids

  tags = merge(var.tags, { Name = "${var.name_prefix}-db" })
}

resource "aws_security_group" "rds" {
  name        = "${var.name_prefix}-rds"
  description = "PostgreSQL de ${var.name_prefix}, solo desde el proxy"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, { Name = "${var.name_prefix}-rds" })
}

resource "aws_security_group" "proxy" {
  name        = "${var.name_prefix}-rds-proxy"
  description = "RDS Proxy de ${var.name_prefix}, solo desde clientes autorizados"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, { Name = "${var.name_prefix}-rds-proxy" })
}

resource "aws_vpc_security_group_ingress_rule" "rds_from_proxy" {
  security_group_id            = aws_security_group.rds.id
  referenced_security_group_id = aws_security_group.proxy.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  description                  = "PostgreSQL desde el proxy"
}

resource "aws_vpc_security_group_ingress_rule" "proxy_from_clients" {
  count = length(var.allowed_security_group_ids)

  security_group_id            = aws_security_group.proxy.id
  referenced_security_group_id = var.allowed_security_group_ids[count.index]
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  description                  = "PostgreSQL desde un cliente autorizado"
}

resource "aws_vpc_security_group_egress_rule" "proxy_to_rds" {
  security_group_id            = aws_security_group.proxy.id
  referenced_security_group_id = aws_security_group.rds.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  description                  = "Hacia PostgreSQL"
}

resource "aws_vpc_security_group_egress_rule" "proxy_to_endpoints" {
  security_group_id            = aws_security_group.proxy.id
  referenced_security_group_id = var.endpoint_security_group_id
  from_port                    = 443
  to_port                      = 443
  ip_protocol                  = "tcp"
  description                  = "Hacia Secrets Manager por endpoint de VPC"
}

resource "aws_db_instance" "this" {
  identifier = "${var.name_prefix}-postgres"

  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true

  db_name  = var.db_name
  username = var.db_username

  manage_master_user_password = true

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false

  multi_az                   = var.multi_az
  deletion_protection        = var.deletion_protection
  backup_retention_period    = var.backup_retention_period
  copy_tags_to_snapshot      = true
  auto_minor_version_upgrade = true

  enabled_cloudwatch_logs_exports       = ["postgresql"]
  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  skip_final_snapshot = var.skip_final_snapshot
  # El sufijo con fecha se fija al crear. ignore_changes evita un reemplazo en cada plan.
  final_snapshot_identifier = "${var.name_prefix}-postgres-final-${formatdate("YYYYMMDDhhmmss", timestamp())}"

  tags = merge(var.tags, { Name = "${var.name_prefix}-postgres" })

  lifecycle {
    ignore_changes = [final_snapshot_identifier]
  }
}

resource "aws_db_instance" "replica" {
  count = var.read_replica_count

  identifier          = "${var.name_prefix}-postgres-replica-${count.index + 1}"
  replicate_source_db = aws_db_instance.this.identifier
  instance_class      = var.instance_class

  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az               = false

  auto_minor_version_upgrade            = true
  deletion_protection                   = var.deletion_protection
  enabled_cloudwatch_logs_exports       = ["postgresql"]
  performance_insights_enabled          = true
  performance_insights_retention_period = 7

  skip_final_snapshot = true

  tags = merge(var.tags, { Name = "${var.name_prefix}-postgres-replica-${count.index + 1}" })
}

resource "aws_iam_role" "proxy" {
  name = "${var.name_prefix}-rds-proxy"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "rds.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy" "proxy_read_secret" {
  name = "read-master-secret"
  role = aws_iam_role.proxy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ReadMasterSecret"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
        ]
        Resource = [local.master_secret_arn]
      },
      {
        Sid      = "DecryptThroughSecretsManager"
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = "*"
        Condition = {
          StringEquals = {
            "kms:ViaService" = "secretsmanager.${data.aws_region.current.region}.amazonaws.com"
          }
        }
      },
    ]
  })
}

resource "aws_db_proxy" "this" {
  name          = "${var.name_prefix}-proxy"
  engine_family = "POSTGRESQL"
  debug_logging = false
  require_tls   = true

  idle_client_timeout    = 1800
  role_arn               = aws_iam_role.proxy.arn
  vpc_security_group_ids = [aws_security_group.proxy.id]
  vpc_subnet_ids         = var.private_subnet_ids

  auth {
    auth_scheme = "SECRETS"
    iam_auth    = "DISABLED"
    secret_arn  = local.master_secret_arn
  }

  depends_on = [aws_iam_role_policy.proxy_read_secret]

  tags = merge(var.tags, { Name = "${var.name_prefix}-proxy" })
}

resource "aws_db_proxy_default_target_group" "this" {
  db_proxy_name = aws_db_proxy.this.name

  connection_pool_config {
    max_connections_percent      = 100
    max_idle_connections_percent = 50
    connection_borrow_timeout    = 120
  }
}

resource "aws_db_proxy_target" "this" {
  db_proxy_name          = aws_db_proxy.this.name
  target_group_name      = aws_db_proxy_default_target_group.this.name
  db_instance_identifier = aws_db_instance.this.identifier
}
