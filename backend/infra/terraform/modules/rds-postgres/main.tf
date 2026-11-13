data "aws_region" "current" {}

data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

locals {
  master_secret_arn = aws_db_instance.this.master_user_secret[0].secret_arn

  # Familia del grupo de parámetros: postgres17 para la versión mayor 17.
  parameter_group_family = "postgres${split(".", var.engine_version)[0]}"

  users = { for u in var.service_users : u.name => u }

  bootstrap_users = [
    for u in var.service_users : {
      name            = u.name
      secret_arn      = aws_secretsmanager_secret.service[u.name].arn
      rds_replication = u.rds_replication
    }
  ]

  # Lo que crea el bootstrap: roles de grupo, bases con su dueño, lectores y extensiones.
  bootstrap_spec = {
    users       = local.bootstrap_users
    group_roles = var.group_roles
    databases   = var.databases
  }

  role_names = concat([for u in var.service_users : u.name], [for g in var.group_roles : g.name])

  service_secret_arns = [for s in aws_secretsmanager_secret.service : s.arn]
  rotation_enabled    = var.enable_secret_rotation
  alarm_actions       = var.alarm_topic_arn == null ? [] : [var.alarm_topic_arn]

  instance_identifier = "${var.name_prefix}-postgres"
  replica_identifiers = [for i in range(var.read_replica_count) : "${var.name_prefix}-postgres-replica-${i + 1}"]
  bootstrap_function  = "${var.name_prefix}-db-bootstrap"
  rotation_function   = "${var.name_prefix}-db-rotation"
  log_group_arn_base  = "arn:${data.aws_partition.current.partition}:logs:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:log-group"
}

# Cada base tiene un dueño declarado y cada miembro de un grupo es un usuario de servicio.
resource "terraform_data" "input_check" {
  input = local.role_names

  lifecycle {
    precondition {
      condition     = alltrue([for d in var.databases : contains(local.role_names, d.owner)])
      error_message = "El dueño de cada base debe estar en service_users o en group_roles."
    }

    precondition {
      condition     = alltrue(flatten([for d in var.databases : [for r in d.readers : contains(local.role_names, r)]]))
      error_message = "Los lectores de cada base deben estar en service_users o en group_roles."
    }

    precondition {
      condition     = alltrue(flatten([for g in var.group_roles : [for m in g.members : contains([for u in var.service_users : u.name], m)]]))
      error_message = "Los miembros de un rol de grupo deben estar en service_users."
    }

    precondition {
      condition     = length(distinct(local.role_names)) == length(local.role_names)
      error_message = "Un nombre no puede ser a la vez usuario de servicio y rol de grupo."
    }
  }
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
    Statement = [
      {
        Sid       = "EnableIamPolicies"
        Effect    = "Allow"
        Principal = { AWS = "arn:${data.aws_partition.current.partition}:iam::${data.aws_caller_identity.current.account_id}:root" }
        Action    = "kms:*"
        Resource  = "*"
      },
      {
        Sid       = "AllowCloudWatchLogs"
        Effect    = "Allow"
        Principal = { Service = "logs.${data.aws_region.current.region}.amazonaws.com" }
        Action    = ["kms:Encrypt*", "kms:Decrypt*", "kms:ReEncrypt*", "kms:GenerateDataKey*", "kms:Describe*"]
        Resource  = "*"
        Condition = {
          ArnLike = {
            "kms:EncryptionContext:aws:logs:arn" = [
              "${local.log_group_arn_base}:/aws/rds/instance/${local.instance_identifier}*",
              "${local.log_group_arn_base}:/aws/lambda/${var.name_prefix}-db-*",
            ]
          }
        }
      },
    ]
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

# Las réplicas no pasan por RDS Proxy: fuera de Aurora el proxy solo admite la instancia
# escritora. Los clientes autorizados leen directo de la réplica, con TLS.
resource "aws_security_group" "replica" {
  count = var.read_replica_count > 0 ? 1 : 0

  name        = "${var.name_prefix}-rds-replica"
  description = "Réplicas de lectura de ${var.name_prefix}, solo desde clientes autorizados"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, { Name = "${var.name_prefix}-rds-replica" })
}

resource "aws_vpc_security_group_ingress_rule" "replica_from_clients" {
  count = var.read_replica_count > 0 ? length(var.allowed_security_group_ids) : 0

  security_group_id            = aws_security_group.replica[0].id
  referenced_security_group_id = var.allowed_security_group_ids[count.index]
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  description                  = "PostgreSQL de lectura desde un cliente autorizado"
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
# Log groups con retención y CMK. Se crean antes que la instancia y las funciones;
# si no, AWS los crea solos sin expiración ni cifrado propio.
# ---------------------------------------------------------------------------

resource "aws_cloudwatch_log_group" "postgresql" {
  for_each = toset(concat([local.instance_identifier], local.replica_identifiers))

  name              = "/aws/rds/instance/${each.value}/postgresql"
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.this.arn

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "bootstrap" {
  name              = "/aws/lambda/${local.bootstrap_function}"
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.this.arn

  tags = var.tags
}

resource "aws_cloudwatch_log_group" "rotation" {
  count = local.rotation_enabled ? 1 : 0

  name              = "/aws/lambda/${local.rotation_function}"
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.this.arn

  tags = var.tags
}

# ---------------------------------------------------------------------------
# Instancia primaria y réplicas.
# ---------------------------------------------------------------------------

resource "aws_db_instance" "this" {
  identifier = local.instance_identifier

  engine         = "postgres"
  engine_version = var.engine_version
  instance_class = var.instance_class

  allocated_storage     = var.allocated_storage
  max_allocated_storage = var.max_allocated_storage
  storage_type          = "gp3"
  storage_encrypted     = true
  kms_key_id            = aws_kms_key.this.arn

  # Sin base inicial: el bootstrap crea el catálogo y las bases de cada servicio.
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

  depends_on = [aws_cloudwatch_log_group.postgresql]
}

resource "aws_db_instance" "replica" {
  count = var.read_replica_count

  identifier          = local.replica_identifiers[count.index]
  replicate_source_db = aws_db_instance.this.identifier
  instance_class      = var.instance_class

  storage_encrypted    = true
  kms_key_id           = aws_kms_key.this.arn
  parameter_group_name = aws_db_parameter_group.this.name

  vpc_security_group_ids = [aws_security_group.replica[0].id]
  publicly_accessible    = false
  multi_az               = false

  auto_minor_version_upgrade            = true
  deletion_protection                   = var.deletion_protection
  enabled_cloudwatch_logs_exports       = ["postgresql"]
  performance_insights_enabled          = true
  performance_insights_kms_key_id       = aws_kms_key.this.arn
  performance_insights_retention_period = var.performance_insights_retention_days

  skip_final_snapshot = true

  tags = merge(var.tags, { Name = local.replica_identifiers[count.index] })

  depends_on = [aws_cloudwatch_log_group.postgresql]
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
# necesita conectarse sin pasar por el proxy. Las apps usan proxy_endpoint y reader_endpoints.
# dbname es la base de mantenimiento: la rotación solo cambia la contraseña del rol. Las
# bases de cada servicio llegan a la app en un mapa aparte (stack data).
resource "aws_secretsmanager_secret_version" "service" {
  for_each = local.users

  secret_id = aws_secretsmanager_secret.service[each.key].id
  secret_string_wo = jsonencode({
    engine   = "postgres"
    username = each.key
    password = ephemeral.random_password.service[each.key].result
    host     = aws_db_instance.this.address
    port     = aws_db_instance.this.port
    dbname   = "postgres"
  })
  secret_string_wo_version = 1
}

data "archive_file" "bootstrap" {
  type        = "zip"
  source_dir  = "${path.module}/lambda/db_bootstrap"
  output_path = "${path.module}/.build/db_bootstrap.zip"
  excludes    = ["**/__pycache__/*", "test_*.py", "requirements.txt"]
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
  function_name = local.bootstrap_function
  role          = aws_iam_role.bootstrap.arn
  runtime       = "python3.13"
  architectures = ["arm64"]
  handler       = "handler.handler"
  timeout       = 300

  filename         = data.archive_file.bootstrap.output_path
  source_code_hash = data.archive_file.bootstrap.output_base64sha256

  vpc_config {
    subnet_ids         = var.data_subnet_ids
    security_group_ids = [aws_security_group.tooling.id]
  }

  tags = var.tags

  depends_on = [
    aws_iam_role_policy_attachment.bootstrap_vpc,
    aws_iam_role_policy.bootstrap,
    aws_cloudwatch_log_group.bootstrap,
  ]
}

# Crea (o completa) roles, bases, extensiones y permisos. Se repite cuando cambia la
# especificación o el código. Nunca borra bases ni roles.
resource "aws_lambda_invocation" "bootstrap" {
  function_name = aws_lambda_function.bootstrap.function_name

  input = jsonencode(merge(local.bootstrap_spec, {
    master_secret_arn = local.master_secret_arn
    host              = aws_db_instance.this.address
    port              = aws_db_instance.this.port
    extensions        = ["pg_stat_statements"]
  }))

  triggers = {
    spec = sha256(jsonencode(local.bootstrap_spec))
    code = data.archive_file.bootstrap.output_base64sha256
  }

  depends_on = [
    terraform_data.input_check,
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

  # kmsKeyArn da al rol de la función permiso para descifrar y cifrar con la CMK de los secretos.
  parameters = {
    endpoint            = "https://secretsmanager.${data.aws_region.current.region}.amazonaws.com"
    functionName        = local.rotation_function
    kmsKeyArn           = aws_kms_key.this.arn
    vpcSubnetIds        = join(",", var.data_subnet_ids)
    vpcSecurityGroupIds = aws_security_group.tooling.id
  }

  tags = var.tags

  depends_on = [aws_cloudwatch_log_group.rotation]
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
