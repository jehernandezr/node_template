data "aws_region" "current" {}

data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

locals {
  master_secret_arn = aws_db_instance.this.master_user_secret[0].secret_arn

  # Familia del grupo de parámetros: postgres17 para la versión mayor 17.
  parameter_group_family = "postgres${split(".", var.engine_version)[0]}"

  users = { for u in var.service_users : u.name => u }

  # Esquema propio por servicio, salvo que se indique lo contrario.
  bootstrap_users = [
    for u in var.service_users : {
      name            = u.name
      secret_arn      = aws_secretsmanager_secret.service[u.name].arn
      schema          = u.create_schema ? coalesce(u.schema, u.name) : null
      rds_replication = u.rds_replication
    }
  ]

  service_secret_arns = [for s in aws_secretsmanager_secret.service : s.arn]
  rotation_enabled    = var.enable_secret_rotation
  alarm_actions       = var.alarm_topic_arn == null ? [] : [var.alarm_topic_arn]
}

# ---------------------------------------------------------------------------
# Clave KMS (CMK): almacenamiento, Performance Insights y secretos.
# ---------------------------------------------------------------------------

resource "aws_kms_key" "this" {
  description             = "Cifrado de RDS, Performance Insights y secretos de ${var.name_prefix}"
  enable_key_rotation     = true
  deletion_window_in_days = 30

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "EnableIamPolicies"
      Effect    = "Allow"
      Principal = { AWS = "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:root" }
      Action    = "kms:*"
      Resource  = "*"
    }]
  })

  tags = var.tags
}

resource "aws_kms_alias" "this" {
  name          = "alias/${var.name_prefix}-rds"
  target_key_id = aws_kms_key.this.key_id
}

# ---------------------------------------------------------------------------
# Red y seguridad.
# ---------------------------------------------------------------------------

resource "aws_db_subnet_group" "this" {
  name       = "${var.name_prefix}-db"
  subnet_ids = var.data_subnet_ids

  tags = merge(var.tags, { Name = "${var.name_prefix}-db" })
}

resource "aws_security_group" "rds" {
  name        = "${var.name_prefix}-rds"
  description = "PostgreSQL de ${var.name_prefix}, solo desde el proxy y las herramientas de base de datos"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, { Name = "${var.name_prefix}-rds" })
}

resource "aws_security_group" "proxy" {
  name        = "${var.name_prefix}-rds-proxy"
  description = "RDS Proxy de ${var.name_prefix}, solo desde clientes autorizados"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, { Name = "${var.name_prefix}-rds-proxy" })
}

# Lambdas de administración (creación de usuarios y rotación). Solo hablan con RDS y Secrets Manager.
resource "aws_security_group" "tooling" {
  name        = "${var.name_prefix}-rds-tooling"
  description = "Lambdas de bootstrap y rotación de usuarios de ${var.name_prefix}"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, { Name = "${var.name_prefix}-rds-tooling" })
}

resource "aws_vpc_security_group_ingress_rule" "rds_from_proxy" {
  security_group_id            = aws_security_group.rds.id
  referenced_security_group_id = aws_security_group.proxy.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  description                  = "PostgreSQL desde el proxy"
}

resource "aws_vpc_security_group_ingress_rule" "rds_from_tooling" {
  security_group_id            = aws_security_group.rds.id
  referenced_security_group_id = aws_security_group.tooling.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  description                  = "PostgreSQL desde las lambdas de bootstrap y rotación"
}

resource "aws_vpc_security_group_egress_rule" "tooling_to_rds" {
  security_group_id            = aws_security_group.tooling.id
  referenced_security_group_id = aws_security_group.rds.id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  description                  = "Hacia PostgreSQL"
}

resource "aws_vpc_security_group_egress_rule" "tooling_to_endpoints" {
  security_group_id            = aws_security_group.tooling.id
  referenced_security_group_id = var.endpoint_security_group_id
  from_port                    = 443
  to_port                      = 443
  ip_protocol                  = "tcp"
  description                  = "HTTPS hacia Secrets Manager y Logs por endpoints de VPC"
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

# ---------------------------------------------------------------------------
# Grupo de parámetros: replicación lógica, consultas lentas y pg_stat_statements.
# ---------------------------------------------------------------------------

resource "aws_db_parameter_group" "this" {
  name_prefix = "${var.name_prefix}-pg-"
  family      = local.parameter_group_family
  description = "Parámetros de PostgreSQL de ${var.name_prefix}"

  # Necesario para mover shards sin corte con replicación lógica (ADR 0010). Pide reinicio.
  parameter {
    name         = "rds.logical_replication"
    value        = "1"
    apply_method = "pending-reboot"
  }

  parameter {
    name         = "shared_preload_libraries"
    value        = "pg_stat_statements"
    apply_method = "pending-reboot"
  }

  parameter {
    name  = "pg_stat_statements.track"
    value = "all"
  }

  parameter {
    name  = "log_min_duration_statement"
    value = tostring(var.log_min_duration_statement_ms)
  }

  parameter {
    name  = "log_lock_waits"
    value = "1"
  }

  parameter {
    name  = "rds.force_ssl"
    value = "1"
  }

  parameter {
    name         = "max_replication_slots"
    value        = tostring(var.max_replication_slots)
    apply_method = "pending-reboot"
  }

  parameter {
    name         = "max_wal_senders"
    value        = tostring(var.max_replication_slots + 5)
    apply_method = "pending-reboot"
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-pg" })

  lifecycle {
    create_before_destroy = true
  }
}

# ---------------------------------------------------------------------------
# Instancia primaria y réplicas.
# ---------------------------------------------------------------------------

resource "aws_db_instance" "this" {
  identifier = "${var.name_prefix}-postgres"

  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = aws_kms_key.this.arn

  db_name  = var.db_name
  username = var.db_username

  manage_master_user_password   = true
  master_user_secret_kms_key_id = aws_kms_key.this.arn

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids = [aws_security_group.rds.id]
  parameter_group_name   = aws_db_parameter_group.this.name
  publicly_accessible    = false

  multi_az                   = var.multi_az
  deletion_protection        = var.deletion_protection
  backup_retention_period    = var.backup_retention_period
  copy_tags_to_snapshot      = true
  auto_minor_version_upgrade = true

  enabled_cloudwatch_logs_exports       = ["postgresql"]
  performance_insights_enabled          = true
  performance_insights_kms_key_id       = aws_kms_key.this.arn
  performance_insights_retention_period = var.performance_insights_retention_days

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

  storage_encrypted    = true
  kms_key_id           = aws_kms_key.this.arn
  parameter_group_name = aws_db_parameter_group.this.name

  vpc_security_group_ids = [aws_security_group.rds.id]
  publicly_accessible    = false
  multi_az               = false

  auto_minor_version_upgrade            = true
  deletion_protection                   = var.deletion_protection
  enabled_cloudwatch_logs_exports       = ["postgresql"]
  performance_insights_enabled          = true
  performance_insights_kms_key_id       = aws_kms_key.this.arn
  performance_insights_retention_period = var.performance_insights_retention_days

  skip_final_snapshot = true

  tags = merge(var.tags, { Name = "${var.name_prefix}-postgres-replica-${count.index + 1}" })
}

# ---------------------------------------------------------------------------
# Usuarios de servicio y secretos. Las apps nunca usan el usuario maestro.
# La contraseña inicial es efímera: nunca llega al estado de Terraform.
# ---------------------------------------------------------------------------

ephemeral "random_password" "service" {
  for_each = local.users

  length  = 40
  special = false
}

resource "aws_secretsmanager_secret" "service" {
  for_each = local.users

  name                    = "${var.name_prefix}/db/${each.key}"
  description             = "Credenciales de PostgreSQL del servicio ${each.key}"
  kms_key_id              = aws_kms_key.this.arn
  recovery_window_in_days = var.secret_recovery_window_days

  tags = merge(var.tags, { Service = each.key })
}

# Valor inicial. El campo host apunta a la instancia directa porque la rotación
# necesita conectarse sin pasar por el proxy. Las apps usan proxy_endpoint y reader_endpoint.
resource "aws_secretsmanager_secret_version" "service" {
  for_each = local.users

  secret_id = aws_secretsmanager_secret.service[each.key].id
  secret_string_wo = jsonencode({
    engine   = "postgres"
    username = each.key
    password = ephemeral.random_password.service[each.key].result
    host     = aws_db_instance.this.address
    port     = aws_db_instance.this.port
    dbname   = var.db_name
  })
  secret_string_wo_version = 1
}

data "archive_file" "bootstrap" {
  type        = "zip"
  source_dir  = "${path.module}/lambda/db_bootstrap"
  output_path = "${path.module}/.build/db_bootstrap.zip"
  excludes    = ["**/__pycache__/*"]
}

resource "aws_iam_role" "bootstrap" {
  name = "${var.name_prefix}-db-bootstrap"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action    = "sts:AssumeRole"
    }]
  })

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "bootstrap_vpc" {
  role       = aws_iam_role.bootstrap.name
  policy_arn = "arn:${data.aws_partition.current.partition}:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_role_policy" "bootstrap" {
  name = "read-db-secrets"
  role = aws_iam_role.bootstrap.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ReadSecrets"
        Effect   = "Allow"
        Action   = ["secretsmanager:GetSecretValue"]
        Resource = concat([local.master_secret_arn], local.service_secret_arns)
      },
      {
        Sid      = "Decrypt"
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = [aws_kms_key.this.arn]
      },
    ]
  })
}

resource "aws_lambda_function" "bootstrap" {
  function_name = "${var.name_prefix}-db-bootstrap"
  role          = aws_iam_role.bootstrap.arn
  runtime       = "python3.13"
  architectures = ["arm64"]
  handler       = "handler.handler"
  timeout       = 120

  filename         = data.archive_file.bootstrap.output_path
  source_code_hash = data.archive_file.bootstrap.output_base64sha256

  vpc_config {
    subnet_ids         = var.data_subnet_ids
    security_group_ids = [aws_security_group.tooling.id]
  }

  tags = var.tags

  depends_on = [aws_iam_role_policy_attachment.bootstrap_vpc, aws_iam_role_policy.bootstrap]
}

# Crea (o completa) los roles en la base. Se repite cuando cambia la lista de usuarios.
resource "aws_lambda_invocation" "bootstrap" {
  function_name = aws_lambda_function.bootstrap.function_name

  input = jsonencode({
    master_secret_arn = local.master_secret_arn
    host              = aws_db_instance.this.address
    port              = aws_db_instance.this.port
    dbname            = var.db_name
    extensions        = ["pg_stat_statements"]
    users             = local.bootstrap_users
  })

  triggers = {
    users = sha256(jsonencode(local.bootstrap_users))
    code  = data.archive_file.bootstrap.output_base64sha256
  }

  depends_on = [
    aws_secretsmanager_secret_version.service,
    aws_vpc_security_group_ingress_rule.rds_from_tooling,
    aws_vpc_security_group_egress_rule.tooling_to_rds,
    aws_vpc_security_group_egress_rule.tooling_to_endpoints,
  ]
}

# ---------------------------------------------------------------------------
# Rotación de los secretos de servicio (función oficial de AWS, estrategia de usuario único).
# ---------------------------------------------------------------------------

data "aws_serverlessapplicationrepository_application" "rotation" {
  count = local.rotation_enabled ? 1 : 0

  application_id = "arn:${data.aws_partition.current.partition}:serverlessrepo:${data.aws_region.current.region}:297356786788:applications/SecretsManagerRDSPostgreSQLRotationSingleUser"
}

resource "aws_serverlessapplicationrepository_cloudformation_stack" "rotation" {
  count = local.rotation_enabled ? 1 : 0

  name             = "${var.name_prefix}-db-rotation"
  application_id   = data.aws_serverlessapplicationrepository_application.rotation[0].application_id
  semantic_version = data.aws_serverlessapplicationrepository_application.rotation[0].semantic_version
  capabilities     = data.aws_serverlessapplicationrepository_application.rotation[0].required_capabilities

  parameters = {
    endpoint            = "https://secretsmanager.${data.aws_region.current.region}.amazonaws.com"
    functionName        = "${var.name_prefix}-db-rotation"
    vpcSubnetIds        = join(",", var.data_subnet_ids)
    vpcSecurityGroupIds = aws_security_group.tooling.id
  }

  tags = var.tags
}

resource "aws_secretsmanager_secret_rotation" "service" {
  for_each = local.rotation_enabled ? local.users : {}

  secret_id           = aws_secretsmanager_secret.service[each.key].id
  rotation_lambda_arn = aws_serverlessapplicationrepository_cloudformation_stack.rotation[0].outputs["RotationLambdaARN"]

  rotation_rules {
    automatically_after_days = var.secret_rotation_days
  }

  # El usuario debe existir en la base antes de la primera rotación.
  depends_on = [aws_lambda_invocation.bootstrap]
}

# ---------------------------------------------------------------------------
# RDS Proxy. Autentica con los secretos de servicio, no con el maestro.
# ---------------------------------------------------------------------------

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
  name = "read-service-secrets"
  role = aws_iam_role.proxy.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "ReadServiceSecrets"
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue",
          "secretsmanager:DescribeSecret",
        ]
        Resource = local.service_secret_arns
      },
      {
        Sid      = "DecryptThroughSecretsManager"
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = [aws_kms_key.this.arn]
        Condition = {
          StringEquals = {
            "kms:ViaService" = "secretsmanager.${data.aws_region.current.region}.amazonaws.com"
          }
        }
      },
    ]
  })
}

# Proxy de escritura: apunta a la instancia primaria.
resource "aws_db_proxy" "this" {
  name          = "${var.name_prefix}-proxy"
  engine_family = "POSTGRESQL"
  debug_logging = false
  require_tls   = true

  idle_client_timeout    = 1800
  role_arn               = aws_iam_role.proxy.arn
  vpc_security_group_ids = [aws_security_group.proxy.id]
  vpc_subnet_ids         = var.data_subnet_ids

  dynamic "auth" {
    for_each = local.users

    content {
      auth_scheme = "SECRETS"
      iam_auth    = "DISABLED"
      secret_arn  = aws_secretsmanager_secret.service[auth.key].arn
    }
  }

  depends_on = [aws_iam_role_policy.proxy_read_secret, aws_secretsmanager_secret_version.service]

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

# Proxy de lectura. RDS Proxy no tiene endpoint lector fuera de Aurora (los endpoints
# READ_ONLY solo existen sobre clústeres Aurora). Para RDS PostgreSQL se registra cada
# réplica como único destino de un proxy propio: cada una tiene su endpoint.
resource "aws_db_proxy" "reader" {
  count = var.read_replica_count

  name          = "${var.name_prefix}-proxy-reader-${count.index + 1}"
  engine_family = "POSTGRESQL"
  debug_logging = false
  require_tls   = true

  idle_client_timeout    = 1800
  role_arn               = aws_iam_role.proxy.arn
  vpc_security_group_ids = [aws_security_group.proxy.id]
  vpc_subnet_ids         = var.data_subnet_ids

  dynamic "auth" {
    for_each = local.users

    content {
      auth_scheme = "SECRETS"
      iam_auth    = "DISABLED"
      secret_arn  = aws_secretsmanager_secret.service[auth.key].arn
    }
  }

  depends_on = [aws_iam_role_policy.proxy_read_secret, aws_secretsmanager_secret_version.service]

  tags = merge(var.tags, { Name = "${var.name_prefix}-proxy-reader-${count.index + 1}" })
}

resource "aws_db_proxy_default_target_group" "reader" {
  count = var.read_replica_count

  db_proxy_name = aws_db_proxy.reader[count.index].name

  connection_pool_config {
    max_connections_percent      = 100
    max_idle_connections_percent = 50
    connection_borrow_timeout    = 120
  }
}

resource "aws_db_proxy_target" "reader" {
  count = var.read_replica_count

  db_proxy_name          = aws_db_proxy.reader[count.index].name
  target_group_name      = aws_db_proxy_default_target_group.reader[count.index].name
  db_instance_identifier = aws_db_instance.replica[count.index].identifier
}

# ---------------------------------------------------------------------------
# Alarmas de RDS.
# ---------------------------------------------------------------------------

resource "aws_cloudwatch_metric_alarm" "cpu" {
  alarm_name          = "${var.name_prefix}-rds-cpu-high"
  alarm_description   = "CPU de la instancia primaria de RDS por encima del umbral"
  namespace           = "AWS/RDS"
  metric_name         = "CPUUtilization"
  statistic           = "Average"
  period              = 300
  evaluation_periods  = 3
  threshold           = var.alarm_cpu_percent
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "missing"

  dimensions = { DBInstanceIdentifier = aws_db_instance.this.identifier }

  alarm_actions = local.alarm_actions
  ok_actions    = local.alarm_actions

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "free_storage" {
  alarm_name          = "${var.name_prefix}-rds-free-storage-low"
  alarm_description   = "Espacio libre de RDS por debajo del umbral"
  namespace           = "AWS/RDS"
  metric_name         = "FreeStorageSpace"
  statistic           = "Minimum"
  period              = 300
  evaluation_periods  = 1
  threshold           = var.alarm_free_storage_bytes
  comparison_operator = "LessThanThreshold"
  treat_missing_data  = "missing"

  dimensions = { DBInstanceIdentifier = aws_db_instance.this.identifier }

  alarm_actions = local.alarm_actions
  ok_actions    = local.alarm_actions

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "freeable_memory" {
  alarm_name          = "${var.name_prefix}-rds-memory-low"
  alarm_description   = "Memoria liberable de RDS por debajo del umbral"
  namespace           = "AWS/RDS"
  metric_name         = "FreeableMemory"
  statistic           = "Minimum"
  period              = 300
  evaluation_periods  = 3
  threshold           = var.alarm_freeable_memory_bytes
  comparison_operator = "LessThanThreshold"
  treat_missing_data  = "missing"

  dimensions = { DBInstanceIdentifier = aws_db_instance.this.identifier }

  alarm_actions = local.alarm_actions
  ok_actions    = local.alarm_actions

  tags = var.tags
}

resource "aws_cloudwatch_metric_alarm" "replica_lag" {
  count = var.read_replica_count

  alarm_name          = "${var.name_prefix}-rds-replica-${count.index + 1}-lag-high"
  alarm_description   = "Retraso de la réplica por encima del umbral"
  namespace           = "AWS/RDS"
  metric_name         = "ReplicaLag"
  statistic           = "Maximum"
  period              = 60
  evaluation_periods  = 5
  threshold           = var.alarm_replica_lag_seconds
  comparison_operator = "GreaterThanThreshold"
  treat_missing_data  = "missing"

  dimensions = { DBInstanceIdentifier = aws_db_instance.replica[count.index].identifier }

  alarm_actions = local.alarm_actions
  ok_actions    = local.alarm_actions

  tags = var.tags
}
