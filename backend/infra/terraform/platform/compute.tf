# Clúster ECS, observabilidad y ALB público. Los servicios viven en services.tf.

module "ecs_cluster" {
  source = "../modules/ecs-cluster"

  name_prefix = var.name_prefix
}

module "observability" {
  count  = var.observability_root_user_email == null ? 0 : 1
  source = "../modules/observability"

  name_prefix                      = var.name_prefix
  vpc_id                           = module.network.vpc_id
  vpc_cidr                         = var.vpc_cidr
  subnet_ids                       = module.network.private_subnet_ids
  cluster_arn                      = module.ecs_cluster.cluster_arn
  cluster_name                     = module.ecs_cluster.cluster_name
  create_internal_alb              = true
  internal_alb_client_cidr_blocks  = [var.vpc_cidr]
  internal_alb_deletion_protection = var.alb_deletion_protection
  root_user_email                  = var.observability_root_user_email
  data_retention_days              = var.observability_data_retention_days
  secret_recovery_window_days      = var.db_secret_recovery_window_days
  storage_force_destroy            = var.force_destroy_buckets
}

# ALB público para la API (detrás de CloudFront) y para Socket.IO y SSE (directo).
module "alb" {
  count  = var.alb_certificate_arn == null ? 0 : 1
  source = "../modules/alb"

  name_prefix               = var.name_prefix
  vpc_id                    = module.network.vpc_id
  subnet_ids                = module.network.public_subnet_ids
  certificate_arn           = var.alb_certificate_arn
  idle_timeout_seconds      = var.alb_idle_timeout_seconds
  deletion_protection       = var.alb_deletion_protection
  access_logs_force_destroy = var.force_destroy_buckets
}
