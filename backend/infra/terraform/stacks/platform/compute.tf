# Shared compute: ECS cluster, OpenObserve, the HTTP API with its internal ALB and the public
# realtime ALB. Services connect to them from their own stack.

locals {
  network = var.compute_enabled ? data.terraform_remote_state.network[0].outputs : null

  realtime_alb_enabled = var.compute_enabled && var.realtime_alb_certificate_arn != null
  api_alb_enabled      = var.compute_enabled && var.fargate_api_enabled
}

# One CMK per environment for the service logs (Fargate tasks and Lambdas, with their
# environment variables and async DLQs). One key per component multiplied the cost and
# the KMS calls without isolating anything that matters: each component's roles already limit
# which log group they write to. ECS Exec keeps the cluster key.
module "compute_logs_kms" {
  count  = var.compute_enabled ? 1 : 0
  source = "../../modules/kms-key"

  alias       = "${var.name_prefix}-compute-logs"
  description = "Encryption of the compute logs, environment variables and DLQ of ${var.name_prefix}"
  log_group_arns = [
    "arn:${data.aws_partition.current.partition}:logs:${var.region}:${data.aws_caller_identity.current.account_id}:log-group:/ecs/${var.name_prefix}/*",
    "arn:${data.aws_partition.current.partition}:logs:${var.region}:${data.aws_caller_identity.current.account_id}:log-group:/aws/lambda/${var.name_prefix}-*",
  ]
  service_principals = [{ sid = "AllowSqsUse", services = ["sqs.amazonaws.com"] }]
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

# --- HTTP API ----------------------------------------------------------------
# A single API for all services, behind CloudFront and its WAF (edge stack).
# Each service adds its routes: Lambda directly or Fargate through the VPC link and the internal ALB.

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

# Internal ALB for the APIs that run on Fargate. Only the VPC link reaches it.
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
  description                  = "VPC link to the internal ALB of the APIs"
}

# --- Realtime ------------------------------------------------------------------
# Socket.IO and SSE go directly to the public ALB: long-lived connections that API Gateway HTTP
# does not support. Services with realtime add their rule to the listener.

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
