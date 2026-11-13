data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

data "aws_region" "current" {}

locals {
  name       = "${var.name_prefix}-openobserve"
  account_id = data.aws_caller_identity.current.account_id
  partition  = data.aws_partition.current.partition
  region     = data.aws_region.current.region
  log_group  = "/ecs/${var.name_prefix}/openobserve"
  bucket     = "${var.name_prefix}-openobserve-${local.account_id}"

  internal_alb = var.create_internal_alb ? 1 : 0
  shared_alb   = var.create_internal_alb ? 0 : 1
  tls_internal = var.internal_alb_certificate_arn != null

  alb_security_group_id = var.create_internal_alb ? aws_security_group.alb[0].id : var.alb_security_group_id
  client_cidr_blocks    = length(var.internal_alb_client_cidr_blocks) > 0 ? var.internal_alb_client_cidr_blocks : [var.vpc_cidr]

  endpoint_host = coalesce(
    var.public_hostname,
    length(var.host_headers) > 0 ? var.host_headers[0] : null,
    var.create_internal_alb ? aws_lb.internal[0].dns_name : var.alb_dns_name,
  )
  endpoint_scheme = var.create_internal_alb && !local.tls_internal ? "http" : "https"
  base_url        = "${local.endpoint_scheme}://${local.endpoint_host}"
}

resource "terraform_data" "input_check" {
  input = local.name

  lifecycle {
    precondition {
      condition     = var.create_internal_alb || (var.alb_listener_arn != null && var.alb_security_group_id != null && length(var.host_headers) > 0)
      error_message = "Con create_internal_alb = false indica alb_listener_arn, alb_security_group_id y host_headers."
    }
  }
}

# --- KMS --------------------------------------------------------------------

resource "aws_kms_key" "this" {
  description             = "Cifrado de OpenObserve de ${var.name_prefix}: bucket, EFS, secreto y logs"
  enable_key_rotation     = true
  deletion_window_in_days = 30

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "EnableIamPolicies"
        Effect    = "Allow"
        Principal = { AWS = "arn:${local.partition}:iam::${local.account_id}:root" }
        Action    = "kms:*"
        Resource  = "*"
      },
      {
        Sid       = "AllowCloudWatchLogs"
        Effect    = "Allow"
        Principal = { Service = "logs.${local.region}.amazonaws.com" }
        Action    = ["kms:Encrypt*", "kms:Decrypt*", "kms:ReEncrypt*", "kms:GenerateDataKey*", "kms:Describe*"]
        Resource  = "*"
        Condition = {
          ArnLike = {
            "kms:EncryptionContext:aws:logs:arn" = "arn:${local.partition}:logs:${local.region}:${local.account_id}:log-group:${local.log_group}"
          }
        }
      },
    ]
  })

  tags = var.tags
}

resource "aws_kms_alias" "this" {
  name          = "alias/${local.name}"
  target_key_id = aws_kms_key.this.key_id
}

# --- Almacenamiento: S3 para los datos y EFS para los metadatos -------------

resource "aws_s3_bucket" "storage" {
  bucket        = local.bucket
  force_destroy = var.storage_force_destroy

  tags = merge(var.tags, { Name = local.bucket })
}

resource "aws_s3_bucket_public_access_block" "storage" {
  bucket = aws_s3_bucket.storage.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_ownership_controls" "storage" {
  bucket = aws_s3_bucket.storage.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_server_side_encryption_configuration" "storage" {
  bucket = aws_s3_bucket.storage.id

  rule {
    bucket_key_enabled = true

    apply_server_side_encryption_by_default {
      sse_algorithm     = "aws:kms"
      kms_master_key_id = aws_kms_key.this.arn
    }
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "storage" {
  bucket = aws_s3_bucket.storage.id

  rule {
    id     = "abort-incomplete-multipart"
    status = "Enabled"

    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

resource "aws_s3_bucket_policy" "storage" {
  bucket = aws_s3_bucket.storage.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "DenyInsecureTransport"
      Effect    = "Deny"
      Principal = "*"
      Action    = "s3:*"
      Resource  = [aws_s3_bucket.storage.arn, "${aws_s3_bucket.storage.arn}/*"]
      Condition = { Bool = { "aws:SecureTransport" = "false" } }
    }]
  })

  depends_on = [aws_s3_bucket_public_access_block.storage]
}

# OpenObserve en un solo nodo guarda sus metadatos (usuarios, dashboards, alertas) en SQLite.
# EFS los conserva entre despliegues; los datos de telemetría van a S3.
resource "aws_security_group" "efs" {
  name        = "${local.name}-efs"
  description = "EFS de OpenObserve, solo desde sus tareas"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, { Name = "${local.name}-efs" })
}

resource "aws_vpc_security_group_ingress_rule" "efs_from_tasks" {
  security_group_id            = aws_security_group.efs.id
  referenced_security_group_id = aws_security_group.service.id
  from_port                    = 2049
  to_port                      = 2049
  ip_protocol                  = "tcp"
  description                  = "NFS desde las tareas de OpenObserve"
}

resource "aws_efs_file_system" "this" {
  encrypted        = true
  kms_key_id       = aws_kms_key.this.arn
  performance_mode = "generalPurpose"
  throughput_mode  = "elastic"

  tags = merge(var.tags, { Name = local.name })
}

resource "aws_efs_backup_policy" "this" {
  file_system_id = aws_efs_file_system.this.id

  backup_policy {
    status = "ENABLED"
  }
}

resource "aws_efs_mount_target" "this" {
  count = length(var.subnet_ids)

  file_system_id  = aws_efs_file_system.this.id
  subnet_id       = var.subnet_ids[count.index]
  security_groups = [aws_security_group.efs.id]
}

resource "aws_efs_access_point" "data" {
  file_system_id = aws_efs_file_system.this.id

  posix_user {
    uid = 0
    gid = 0
  }

  root_directory {
    path = "/openobserve"

    creation_info {
      owner_uid   = 0
      owner_gid   = 0
      permissions = "0755"
    }
  }

  tags = merge(var.tags, { Name = "${local.name}-data" })
}

# --- Secretos ---------------------------------------------------------------

resource "random_password" "root" {
  length           = 40
  special          = true
  override_special = "-_.~"
}

resource "aws_secretsmanager_secret" "root" {
  name                    = "${local.name}-root"
  description             = "Usuario raíz de OpenObserve y cabecera de autorización OTLP"
  kms_key_id              = aws_kms_key.this.arn
  recovery_window_in_days = var.secret_recovery_window_days

  tags = var.tags
}

resource "aws_secretsmanager_secret_version" "root" {
  secret_id = aws_secretsmanager_secret.root.id

  secret_string = jsonencode({
    ZO_ROOT_USER_EMAIL    = var.root_user_email
    ZO_ROOT_USER_PASSWORD = random_password.root.result
    OTLP_AUTHORIZATION    = "Basic ${base64encode("${var.root_user_email}:${random_password.root.result}")}"
  })
}

# --- Logs e IAM -------------------------------------------------------------

resource "aws_cloudwatch_log_group" "this" {
  name              = local.log_group
  retention_in_days = var.log_retention_days
  kms_key_id        = aws_kms_key.this.arn

  tags = var.tags
}

data "aws_iam_policy_document" "ecs_tasks_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "aws:SourceAccount"
      values   = [local.account_id]
    }
  }
}

resource "aws_iam_role" "execution" {
  name               = "${local.name}-execution"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json

  tags = var.tags
}

resource "aws_iam_role_policy_attachment" "execution" {
  role       = aws_iam_role.execution.name
  policy_arn = "arn:${local.partition}:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

data "aws_iam_policy_document" "execution" {
  statement {
    sid       = "ReadRootSecret"
    actions   = ["secretsmanager:GetSecretValue"]
    resources = [aws_secretsmanager_secret.root.arn]
  }

  statement {
    sid       = "UseKey"
    actions   = ["kms:Decrypt", "kms:GenerateDataKey"]
    resources = [aws_kms_key.this.arn]
  }
}

resource "aws_iam_role_policy" "execution" {
  name   = "secrets"
  role   = aws_iam_role.execution.id
  policy = data.aws_iam_policy_document.execution.json
}

resource "aws_iam_role" "task" {
  name               = "${local.name}-task"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json

  tags = var.tags
}

data "aws_iam_policy_document" "task" {
  statement {
    sid       = "StorageObjects"
    actions   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject", "s3:AbortMultipartUpload", "s3:ListMultipartUploadParts"]
    resources = ["${aws_s3_bucket.storage.arn}/*"]
  }

  statement {
    sid       = "StorageBucket"
    actions   = ["s3:ListBucket", "s3:GetBucketLocation"]
    resources = [aws_s3_bucket.storage.arn]
  }

  statement {
    sid       = "UseKey"
    actions   = ["kms:Encrypt", "kms:Decrypt", "kms:GenerateDataKey", "kms:DescribeKey"]
    resources = [aws_kms_key.this.arn]
  }

  statement {
    sid       = "MountEfs"
    actions   = ["elasticfilesystem:ClientMount", "elasticfilesystem:ClientWrite"]
    resources = [aws_efs_file_system.this.arn]

    condition {
      test     = "StringEquals"
      variable = "elasticfilesystem:AccessPointArn"
      values   = [aws_efs_access_point.data.arn]
    }
  }
}

resource "aws_iam_role_policy" "task" {
  name   = "storage"
  role   = aws_iam_role.task.id
  policy = data.aws_iam_policy_document.task.json
}

# --- Red --------------------------------------------------------------------

resource "aws_security_group" "service" {
  name        = local.name
  description = "Tareas de OpenObserve"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, { Name = local.name })
}

resource "aws_vpc_security_group_ingress_rule" "service_from_alb" {
  security_group_id            = aws_security_group.service.id
  referenced_security_group_id = local.alb_security_group_id
  from_port                    = 5080
  to_port                      = 5080
  ip_protocol                  = "tcp"
  description                  = "Tráfico del ALB"
}

# HTTPS saliente por NAT o endpoints de VPC (ADR 0016).
# trivy:ignore:AVD-AWS-0104
resource "aws_vpc_security_group_egress_rule" "service_https" {
  security_group_id = aws_security_group.service.id
  cidr_ipv4         = "0.0.0.0/0"
  from_port         = 443
  to_port           = 443
  ip_protocol       = "tcp"
  description       = "HTTPS hacia S3, KMS y Secrets Manager por endpoints de VPC"
}

resource "aws_vpc_security_group_egress_rule" "service_vpc" {
  security_group_id = aws_security_group.service.id
  cidr_ipv4         = var.vpc_cidr
  from_port         = 2049
  to_port           = 2049
  ip_protocol       = "tcp"
  description       = "NFS hacia EFS"
}

resource "aws_security_group" "alb" {
  count = local.internal_alb

  name        = "${local.name}-alb"
  description = "ALB interno de OpenObserve"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, { Name = "${local.name}-alb" })
}

resource "aws_vpc_security_group_ingress_rule" "alb_clients" {
  for_each = var.create_internal_alb ? toset(local.client_cidr_blocks) : toset([])

  security_group_id = aws_security_group.alb[0].id
  cidr_ipv4         = each.value
  from_port         = local.tls_internal ? 443 : 80
  to_port           = local.tls_internal ? 443 : 80
  ip_protocol       = "tcp"
  description       = "Clientes de telemetría y consola"
}

resource "aws_vpc_security_group_egress_rule" "alb_to_service" {
  security_group_id            = local.alb_security_group_id
  referenced_security_group_id = aws_security_group.service.id
  from_port                    = 5080
  to_port                      = 5080
  ip_protocol                  = "tcp"
  description                  = "ALB hacia OpenObserve"
}

resource "aws_lb" "internal" {
  count = local.internal_alb

  name                       = substr("${local.name}-alb", 0, 32)
  load_balancer_type         = "application"
  internal                   = true
  security_groups            = [aws_security_group.alb[0].id]
  subnets                    = var.subnet_ids
  idle_timeout               = 120
  drop_invalid_header_fields = true
  enable_deletion_protection = var.internal_alb_deletion_protection

  tags = merge(var.tags, { Name = "${local.name}-alb" })
}

resource "aws_lb_target_group" "this" {
  name                 = substr(local.name, 0, 32)
  port                 = 5080
  protocol             = "HTTP"
  target_type          = "ip"
  vpc_id               = var.vpc_id
  deregistration_delay = 30

  stickiness {
    type    = "lb_cookie"
    enabled = false
  }

  health_check {
    path                = "/healthz"
    matcher             = "200"
    interval            = 15
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = merge(var.tags, { Name = local.name })
}

resource "aws_lb_listener" "internal" {
  count = local.internal_alb

  load_balancer_arn = aws_lb.internal[0].arn
  port              = local.tls_internal ? 443 : 80
  protocol          = local.tls_internal ? "HTTPS" : "HTTP"
  ssl_policy        = local.tls_internal ? "ELBSecurityPolicy-TLS13-1-2-Res-2021-06" : null
  certificate_arn   = var.internal_alb_certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.this.arn
  }

  tags = var.tags
}

resource "aws_lb_listener_rule" "shared" {
  count = local.shared_alb

  listener_arn = var.alb_listener_arn
  priority     = var.listener_rule_priority

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.this.arn
  }

  condition {
    host_header {
      values = var.host_headers
    }
  }

  tags = var.tags
}

# --- Tarea y servicio -------------------------------------------------------

resource "aws_ecs_task_definition" "this" {
  family                   = local.name
  requires_compatibilities = ["FARGATE"]
  network_mode             = "awsvpc"
  cpu                      = var.cpu
  memory                   = var.memory
  execution_role_arn       = aws_iam_role.execution.arn
  task_role_arn            = aws_iam_role.task.arn

  runtime_platform {
    operating_system_family = "LINUX"
    cpu_architecture        = var.cpu_architecture
  }

  volume {
    name = "data"

    efs_volume_configuration {
      file_system_id     = aws_efs_file_system.this.id
      transit_encryption = "ENABLED"

      authorization_config {
        access_point_id = aws_efs_access_point.data.id
        iam             = "ENABLED"
      }
    }
  }

  container_definitions = jsonencode([{
    name      = "openobserve"
    image     = var.image
    essential = true

    portMappings = [{ containerPort = 5080, protocol = "tcp" }]

    environment = [
      { name = "ZO_DATA_DIR", value = "/data" },
      { name = "ZO_LOCAL_MODE", value = "true" },
      { name = "ZO_LOCAL_MODE_STORAGE", value = "s3" },
      { name = "ZO_S3_PROVIDER", value = "aws" },
      { name = "ZO_S3_BUCKET_NAME", value = aws_s3_bucket.storage.id },
      { name = "ZO_S3_REGION_NAME", value = local.region },
      { name = "ZO_S3_SERVER_URL", value = "https://s3.${local.region}.amazonaws.com" },
      { name = "ZO_COMPACT_DATA_RETENTION_DAYS", value = tostring(var.data_retention_days) },
      { name = "ZO_TELEMETRY", value = "false" },
    ]

    secrets = [
      { name = "ZO_ROOT_USER_EMAIL", valueFrom = "${aws_secretsmanager_secret.root.arn}:ZO_ROOT_USER_EMAIL::" },
      { name = "ZO_ROOT_USER_PASSWORD", valueFrom = "${aws_secretsmanager_secret.root.arn}:ZO_ROOT_USER_PASSWORD::" },
    ]

    mountPoints = [{ sourceVolume = "data", containerPath = "/data", readOnly = false }]

    logConfiguration = {
      logDriver = "awslogs"
      options = {
        "awslogs-group"         = aws_cloudwatch_log_group.this.name
        "awslogs-region"        = local.region
        "awslogs-stream-prefix" = "openobserve"
      }
    }
  }])

  tags = var.tags

  depends_on = [aws_secretsmanager_secret_version.root, terraform_data.input_check]
}

# Un solo nodo con SQLite en EFS: nunca dos tareas a la vez, así que el despliegue
# detiene la tarea anterior antes de iniciar la nueva.
resource "aws_ecs_service" "this" {
  name            = "openobserve"
  cluster         = var.cluster_arn
  task_definition = aws_ecs_task_definition.this.arn
  desired_count   = 1
  propagate_tags  = "SERVICE"

  health_check_grace_period_seconds  = 120
  deployment_minimum_healthy_percent = 0
  deployment_maximum_percent         = 100

  deployment_circuit_breaker {
    enable   = true
    rollback = true
  }

  capacity_provider_strategy {
    capacity_provider = "FARGATE"
    weight            = 1
  }

  network_configuration {
    subnets          = var.subnet_ids
    security_groups  = [aws_security_group.service.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.this.arn
    container_name   = "openobserve"
    container_port   = 5080
  }

  tags = merge(var.tags, { Name = local.name })

  depends_on = [aws_efs_mount_target.this, aws_lb_listener.internal, aws_lb_listener_rule.shared]
}
