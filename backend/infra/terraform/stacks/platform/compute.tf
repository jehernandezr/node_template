# Cómputo compartido: clúster ECS, OpenObserve, la API HTTP con su ALB interno y el ALB
# público de tiempo real. Los servicios se conectan a ellos desde su propio stack.

locals {
  network = var.compute_enabled ? data.terraform_remote_state.network[0].outputs : null

  realtime_alb_enabled = var.compute_enabled && var.realtime_alb_certificate_arn != null
  api_alb_enabled      = var.compute_enabled && var.fargate_api_enabled
}

module "ecs_cluster" {
  count  = var.compute_enabled ? 1 : 0
  source = "../../modules/ecs-cluster"

  name_prefix = var.name_prefix
}

module "observability" {
  count  = var.compute_enabled && var.observability_root_user_email != null ? 1 : 0
  source = "../../modules/observability"

  name_prefix                      = var.name_prefix
  vpc_id                           = local.network.vpc_id
  vpc_cidr                         = local.network.vpc_cidr
  subnet_ids                       = local.network.private_subnet_ids
  cluster_arn                      = module.ecs_cluster[0].cluster_arn
  create_internal_alb              = true
  internal_alb_client_cidr_blocks  = [local.network.vpc_cidr]
  internal_alb_deletion_protection = var.alb_deletion_protection
  root_user_email                  = var.observability_root_user_email
  data_retention_days              = var.observability_data_retention_days
  secret_recovery_window_days      = var.secret_recovery_window_days
  storage_force_destroy            = var.force_destroy_buckets
}

# --- API HTTP ----------------------------------------------------------------
# Una sola API para todos los servicios, detrás de CloudFront y su WAF (stack edge).
# Cada servicio agrega sus rutas: Lambda directo o Fargate por el VPC link y el ALB interno.

module "http_api" {
  count  = var.compute_enabled ? 1 : 0
  source = "../../modules/http-api"

  name_prefix = var.name_prefix
  vpc_link = local.api_alb_enabled ? {
    vpc_id     = local.network.vpc_id
    subnet_ids = local.network.private_subnet_ids
  } : null
  throttling_burst_limit      = var.api_throttling_burst_limit
  throttling_rate_limit       = var.api_throttling_rate_limit
  log_retention_days          = var.log_retention_days
  secret_recovery_window_days = var.secret_recovery_window_days
}

# ALB interno de las APIs que corren en Fargate. Solo lo alcanza el VPC link.
module "api_alb" {
  count  = local.api_alb_enabled ? 1 : 0
  source = "../../modules/alb"

  name_prefix                = var.name_prefix
  name                       = "api"
  internal                   = true
  vpc_id                     = local.network.vpc_id
  subnet_ids                 = local.network.private_subnet_ids
  ingress_cidr_blocks        = []
  ingress_ipv6_cidr_blocks   = []
  ingress_security_group_ids = [module.http_api[0].vpc_link_security_group_id]
  idle_timeout_seconds       = 60
  deletion_protection        = var.alb_deletion_protection
  access_logs_force_destroy  = var.force_destroy_buckets
}

resource "aws_vpc_security_group_egress_rule" "vpc_link_to_api_alb" {
  count = local.api_alb_enabled ? 1 : 0

  security_group_id            = module.http_api[0].vpc_link_security_group_id
  referenced_security_group_id = module.api_alb[0].security_group_id
  from_port                    = module.api_alb[0].listener_port
  to_port                      = module.api_alb[0].listener_port
  ip_protocol                  = "tcp"
  description                  = "VPC link hacia el ALB interno de las APIs"
}

# --- Tiempo real ---------------------------------------------------------------
# Socket.IO y SSE llegan directo al ALB público: conexiones largas que API Gateway HTTP
# no admite. Los servicios con realtime agregan su regla al listener.

module "realtime_alb" {
  count  = local.realtime_alb_enabled ? 1 : 0
  source = "../../modules/alb"

  name_prefix               = var.name_prefix
  name                      = "rt"
  vpc_id                    = local.network.vpc_id
  subnet_ids                = local.network.public_subnet_ids
  certificate_arn           = var.realtime_alb_certificate_arn
  idle_timeout_seconds      = var.alb_idle_timeout_seconds
  deletion_protection       = var.alb_deletion_protection
  access_logs_force_destroy = var.force_destroy_buckets
}
