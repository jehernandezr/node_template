data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

data "aws_region" "current" {}

locals {
  cache_arn = aws_elasticache_serverless_cache.this.arn

  # ARN de cada usuario IAM. Con el ARN de la caché forman los recursos de elasticache:Connect.
  user_arns = {
    for name, u in aws_elasticache_user.app :
    name => "arn:${data.aws_partition.current.partition}:elasticache:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:user:${u.user_id}"
  }
}

resource "aws_kms_key" "this" {
  description             = "Cifrado en reposo de Valkey de ${var.name_prefix}"
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
  name          = "alias/${var.name_prefix}-valkey"
  target_key_id = aws_kms_key.this.key_id
}

resource "aws_security_group" "this" {
  name        = "${var.name_prefix}-valkey"
  description = "Valkey de ${var.name_prefix}, solo desde clientes autorizados"
  vpc_id      = var.vpc_id

  tags = merge(var.tags, { Name = "${var.name_prefix}-valkey" })
}

resource "aws_vpc_security_group_ingress_rule" "from_clients" {
  count = length(var.allowed_security_group_ids)

  security_group_id            = aws_security_group.this.id
  referenced_security_group_id = var.allowed_security_group_ids[count.index]
  from_port                    = 6379
  to_port                      = 6380
  ip_protocol                  = "tcp"
  description                  = "Valkey desde un cliente autorizado"
}

# Autenticación: el usuario default queda deshabilitado y cada servicio entra con un
# usuario propio autenticado por IAM. No hay contraseñas ni secretos que guardar.
resource "aws_elasticache_user" "default" {
  user_id       = "${var.name_prefix}-default-off"
  user_name     = "default"
  engine        = "valkey"
  access_string = "off ~* -@all"

  authentication_mode {
    type = "no-password-required"
  }

  tags = var.tags
}

resource "aws_elasticache_user" "app" {
  for_each = var.users

  user_id       = "${var.name_prefix}-${each.key}"
  user_name     = "${var.name_prefix}-${each.key}"
  engine        = "valkey"
  access_string = each.value

  authentication_mode {
    type = "iam"
  }

  tags = merge(var.tags, { Service = each.key })
}

resource "aws_elasticache_user_group" "this" {
  user_group_id = "${var.name_prefix}-valkey"
  engine        = "valkey"
  user_ids = concat(
    [aws_elasticache_user.default.user_id],
    [for u in aws_elasticache_user.app : u.user_id],
  )

  tags = var.tags
}

resource "aws_elasticache_serverless_cache" "this" {
  engine      = "valkey"
  name        = "${var.name_prefix}-valkey"
  description = "Caché Valkey de ${var.name_prefix}"

  subnet_ids         = var.subnet_ids
  security_group_ids = [aws_security_group.this.id]

  kms_key_id    = aws_kms_key.this.arn
  user_group_id = aws_elasticache_user_group.this.user_group_id

  snapshot_retention_limit = var.snapshot_retention_limit

  cache_usage_limits {
    data_storage {
      maximum = var.cache_usage_limits.data_storage_max_gb
      unit    = "GB"
    }
    ecpu_per_second {
      maximum = var.cache_usage_limits.ecpu_per_second_max
    }
  }

  tags = merge(var.tags, { Name = "${var.name_prefix}-valkey" })
}
