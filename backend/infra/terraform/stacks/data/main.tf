# Persistencia de la región: una instancia RDS PostgreSQL compartida con una base por shard
# de cada servicio más el catálogo (ADR 0010), RDS Proxy para escribir, réplicas para leer,
# y Valkey. Las bases, sus dueños y extensiones son los mismos que crea
# backend/infra/local/postgres/init.sql en local.

locals {
  catalog_database = "catalog"
  catalog_owner    = "catalog_owner"
  catalog_reader   = "catalog_reader"

  # Bases de cada servicio: <servicio>_shard_<n> y, si tiene acceso, el catálogo.
  service_databases = {
    for name, svc in var.db_services : name => {
      shards  = [for i in range(svc.shards) : "${name}_shard_${i}"]
      catalog = svc.catalog == null ? null : local.catalog_database
    }
  }

  db_users = concat(
    [for name in sort(keys(var.db_services)) : { name = name, rds_replication = false }],
    [for name in var.db_replication_users : { name = name, rds_replication = true }],
  )

  # Quien migra el catálogo es miembro de catalog_owner; quien solo lo consulta, de catalog_reader.
  group_roles = [
    { name = local.catalog_owner, members = sort([for name, svc in var.db_services : name if svc.catalog == "owner"]) },
    { name = local.catalog_reader, members = sort([for name, svc in var.db_services : name if svc.catalog == "read"]) },
  ]

  databases = concat(
    [{
      name       = local.catalog_database
      owner      = local.catalog_owner
      readers    = [local.catalog_reader]
      extensions = var.db_extensions
    }],
    flatten([
      for name in sort(keys(local.service_databases)) : [
        for db in local.service_databases[name].shards : {
          name       = db
          owner      = name
          readers    = []
          extensions = var.db_extensions
        }
      ]
    ]),
  )

  # Cada servicio solo ve sus llaves y canales: la capa de caché antepone el nombre del servicio.
  valkey_users = merge(
    { for name in var.valkey_services : name => "on ~${name}:* &${name}:* +@all -@dangerous" },
    var.valkey_acl_overrides,
  )

  observability = local.platform.observability
}

# --- Clientes de datos ---------------------------------------------------------
# Los servicios adjuntan este security group: abre la salida exacta hacia RDS Proxy, las
# réplicas, Valkey y OpenObserve, y es el único origen que esos destinos aceptan.

resource "aws_security_group" "clients" {
  name        = "${var.name_prefix}-data-clients"
  description = "Clientes de datos: servicios que usan RDS Proxy, las réplicas, Valkey y OpenObserve"
  vpc_id      = local.network.vpc_id

  tags = { Name = "${var.name_prefix}-data-clients" }
}

resource "aws_vpc_security_group_egress_rule" "clients_to_proxy" {
  security_group_id            = aws_security_group.clients.id
  referenced_security_group_id = module.rds.proxy_security_group_id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  description                  = "Hacia RDS Proxy (escritura)"
}

resource "aws_vpc_security_group_egress_rule" "clients_to_replicas" {
  count = var.db_read_replica_count > 0 ? 1 : 0

  security_group_id            = aws_security_group.clients.id
  referenced_security_group_id = module.rds.replica_security_group_id
  from_port                    = 5432
  to_port                      = 5432
  ip_protocol                  = "tcp"
  description                  = "Hacia las réplicas de lectura"
}

resource "aws_vpc_security_group_egress_rule" "clients_to_valkey" {
  security_group_id            = aws_security_group.clients.id
  referenced_security_group_id = module.valkey.security_group_id
  from_port                    = 6379
  to_port                      = 6380
  ip_protocol                  = "tcp"
  description                  = "Hacia Valkey"
}

resource "aws_vpc_security_group_egress_rule" "clients_to_observability" {
  count = local.observability == null ? 0 : 1

  security_group_id            = aws_security_group.clients.id
  referenced_security_group_id = local.observability.alb_security_group_id
  from_port                    = local.observability.alb_port
  to_port                      = local.observability.alb_port
  ip_protocol                  = "tcp"
  description                  = "Hacia OpenObserve (OTLP)"
}

module "rds" {
  source = "../../modules/rds-postgres"

  name_prefix                = var.name_prefix
  vpc_id                     = local.network.vpc_id
  data_subnet_ids            = local.network.data_subnet_ids
  endpoint_security_group_id = local.network.endpoint_security_group_id
  allowed_security_group_ids = [aws_security_group.clients.id]

  service_users = local.db_users
  group_roles   = local.group_roles
  databases     = local.databases

  enable_secret_rotation              = var.db_enable_secret_rotation
  secret_rotation_days                = var.db_secret_rotation_days
  secret_recovery_window_days         = var.db_secret_recovery_window_days
  log_min_duration_statement_ms       = var.db_log_min_duration_statement_ms
  performance_insights_retention_days = var.db_performance_insights_retention_days
  log_retention_days                  = var.log_retention_days
  alarm_topic_arn                     = local.platform.alarm_topic_arn

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
