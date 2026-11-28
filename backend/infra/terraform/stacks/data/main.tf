# Regional persistence: one shared RDS PostgreSQL instance with one database per shard
# of each service plus its own catalog (ADR 0010, ADR 0042), RDS Proxy with IAM authentication for writes,
# replicas read with IAM tokens, and Valkey. Each service has an owner, an app and a reader role (ADR 0041). The databases, their owners and extensions are the same ones
# backend/infra/local/postgres/init.sql creates locally.

data "aws_partition" "current" {}

data "aws_caller_identity" "current" {}

locals {
  # Databases of each service: its catalog <service>_catalog and its shards <service>_shard_<n>. No service
  # reads another service's catalog.
  service_databases = {
    for name, svc in var.db_services : name => {
      shards  = [for i in range(svc.shards) : "${name}_shard_${i}"]
      catalog = "${name}_catalog"
    }
  }

  # Three roles per service (ADR 0041): the owner runs migrations and owns the databases, the app role runs the
  # service with DML only, and the reader reads the replicas with IAM tokens. The proxy holds the owner and app
  # passwords; clients reach it with IAM.
  db_roles = {
    for name in keys(var.db_services) : name => {
      owner  = "${name}_owner"
      app    = "${name}_app"
      reader = "${name}_reader"
    }
  }

  db_users = concat(
    flatten([
      for name in sort(keys(var.db_services)) : [
        { name = local.db_roles[name].owner, rds_iam = false, rds_replication = false },
        { name = local.db_roles[name].app, rds_iam = false, rds_replication = false },
        { name = local.db_roles[name].reader, rds_iam = true, rds_replication = false },
      ]
    ]),
    [for name in var.db_replication_users : { name = name, rds_iam = false, rds_replication = true }],
  )

  databases = flatten([
    for name in sort(keys(local.service_databases)) : [
      for db in concat([local.service_databases[name].catalog], local.service_databases[name].shards) : {
        name       = db
        owner      = local.db_roles[name].owner
        writers    = [local.db_roles[name].app]
        readers    = [local.db_roles[name].reader]
        extensions = var.db_extensions
      }
    ]
  ])

  # rds-db:connect resources: the app and owner roles through the proxy, the reader on each replica.
  db_connect_arn_base = "arn:${data.aws_partition.current.partition}:rds-db:${var.region}:${data.aws_caller_identity.current.account_id}:dbuser"
  db_connect_arns = {
    for name, roles in local.db_roles : name => {
      app    = ["${local.db_connect_arn_base}:${module.rds.proxy_resource_id}/${roles.app}"]
      owner  = ["${local.db_connect_arn_base}:${module.rds.proxy_resource_id}/${roles.owner}"]
      reader = [for id in module.rds.replica_resource_ids : "${local.db_connect_arn_base}:${id}/${roles.reader}"]
    }
  }

  # Each service sees its own keys and channels: the cache layer prefixes the service name. Also,
  # the shared authentication state (`auth:*`, ADR 0022) is written only by the owner service
  # and the others read it (`%R~`) and subscribe to the revocations channel. The channel ACL does not
  # separate publishing from subscribing; a false notice only costs a lookup, because the verifier
  # checks each revocation against the `auth:revoked:{sid}` key, which nobody else can write.
  valkey_auth_write_rules = "~auth:* &auth:*"
  valkey_auth_read_rules  = "%R~auth:* &auth:revocations"

  valkey_users = merge(
    {
      for name in var.valkey_services : name => join(" ", [
        "on ~${name}:* &${name}:*",
        name == var.valkey_auth_writer ? local.valkey_auth_write_rules : local.valkey_auth_read_rules,
        "+@all -@dangerous",
      ])
    },
    var.valkey_acl_overrides,
  )

  observability = local.platform.observability
}

# --- Data clients --------------------------------------------------------------
# Services attach this security group: it opens the exact egress to RDS Proxy, the
# replicas, Valkey and OpenObserve, and it is the only source those destinations accept.

resource "aws_security_group" "clients" {
  name        = "${var.name_prefix}-data-clients"
  description = "Data clients: services that use RDS Proxy, the replicas, Valkey and OpenObserve"
  vpc_id      = local.network.vpc_id

  tags = { Name = "${var.name_prefix}-data-clients" }
}

resource "aws_vpc_security_group_egress_rule" "clients_to_proxy" {
  security_group_id            = aws_security_group.clients.id
  referenced_security_group_id = module.rds.proxy_security_group_id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  description                  = "To RDS Proxy (writes)"
}

resource "aws_vpc_security_group_egress_rule" "clients_to_replicas" {
  count = var.db_read_replica_count > 0 ? 1 : 0

  security_group_id            = aws_security_group.clients.id
  referenced_security_group_id = module.rds.replica_security_group_id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  description                  = "To the read replicas"
}

resource "aws_vpc_security_group_egress_rule" "clients_to_valkey" {
  security_group_id            = aws_security_group.clients.id
  referenced_security_group_id = module.valkey.security_group_id
  from_port                    = 6379
  to_port                      = 6380
  ip_protocol                  = "tcp"
  description                  = "To Valkey"
}

resource "aws_vpc_security_group_egress_rule" "clients_to_observability" {
  count = local.observability == null ? 0 : 1

  security_group_id            = aws_security_group.clients.id
  referenced_security_group_id = local.observability.alb_security_group_id
  from_port                    = local.observability.alb_port
  to_port                      = local.observability.alb_port
  ip_protocol                  = "tcp"
  description                  = "To OpenObserve (OTLP)"
}

module "rds" {
  source = "../../modules/rds-postgres"

  name_prefix                = var.name_prefix
  vpc_id                     = local.network.vpc_id
  data_subnet_ids            = local.network.data_subnet_ids
  endpoint_security_group_id = local.network.endpoint_security_group_id
  allowed_security_group_ids = [aws_security_group.clients.id]

  service_users = local.db_users
  databases     = local.databases

  enable_secret_rotation              = var.db_enable_secret_rotation
  secret_rotation_days                = var.db_secret_rotation_days
  secret_recovery_window_days         = var.db_secret_recovery_window_days
  log_min_duration_statement_ms       = var.db_log_min_duration_statement_ms
  performance_insights_retention_days = var.db_performance_insights_retention_days
  log_retention_days                  = var.log_retention_days
  alarm_topic_arn                     = local.platform.alarm_topic_arn
  alarm_pinned_connections            = var.db_alarm_pinned_connections

  engine_version          = var.db_engine_version
  instance_class          = var.db_instance_class
  allocated_storage       = var.db_allocated_storage
  max_allocated_storage   = var.db_max_allocated_storage
  multi_az                = var.db_multi_az
  read_replica_count      = var.db_read_replica_count
  deletion_protection     = var.db_deletion_protection
  backup_retention_period = var.db_backup_retention_period
  skip_final_snapshot     = var.db_skip_final_snapshot
  db_username             = var.db_username
}

module "valkey" {
  source = "../../modules/valkey"

  name_prefix                = var.name_prefix
  vpc_id                     = local.network.vpc_id
  subnet_ids                 = local.network.data_subnet_ids
  allowed_security_group_ids = [aws_security_group.clients.id]
  users                      = local.valkey_users
  snapshot_retention_limit   = var.valkey_snapshot_retention_limit
  cache_usage_limits         = var.valkey_cache_usage_limits
}
