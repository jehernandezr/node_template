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

resource "aws_elasticache_serverless_cache" "this" {
  engine      = "valkey"
  name        = "${var.name_prefix}-valkey"
  description = "Caché Valkey de ${var.name_prefix}"

  subnet_ids         = var.subnet_ids
  security_group_ids = [aws_security_group.this.id]

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
