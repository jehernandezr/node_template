data "aws_caller_identity" "current" {}

data "aws_partition" "current" {}

data "aws_region" "current" {}

locals {
  cache_arn = aws_elasticache_serverless_cache.this.arn

  # ARN of each IAM user. Together with the cache ARN they form the elasticache:Connect resources.
  user_arns = {
    for name, u in aws_elasticache_user.app :
    name => "arn:${data.aws_partition.current.partition}:elasticache:${data.aws_region.current.region}:${data.aws_caller_identity.current.account_id}:user:${u.user_id}"
  }
}

module "kms" {
  source = "../kms-key"

  alias       = "${var.name_prefix}-valkey"
  description = "Encryption at rest of Valkey of ${var.name_prefix}"
  tags        = var.tags
}

resource "aws_security_group" "this" {
  name        = "${var.name_prefix}-valkey"
  description = "Valkey of ${var.name_prefix}, only from authorized clients"
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
  description                  = "Valkey from an authorized client"
}

# Authentication: the default user is disabled and each service connects with its own
# IAM-authenticated user. There are no passwords or secrets to store.
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

# The IAM token is signed with the user id and the client authenticates with the user name. ElastiCache
# requires them to be equal, so the client receives a single value (VALKEY_USER).
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

# The platform uses the BF.* commands of the Bloom module, which ships with Valkey 8.1. A
# serverless cache follows the latest minor version of its major version.
resource "aws_elasticache_serverless_cache" "this" {
  engine               = "valkey"
  major_engine_version = "8"
  name                 = "${var.name_prefix}-valkey"
  description          = "Valkey cache of ${var.name_prefix}"

  subnet_ids         = var.subnet_ids
  security_group_ids = [aws_security_group.this.id]

  kms_key_id    = module.kms.arn
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

moved {
  from = aws_kms_key.this
  to   = module.kms.aws_kms_key.this
}

moved {
  from = aws_kms_alias.this
  to   = module.kms.aws_kms_alias.this
}
