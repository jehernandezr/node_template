output "alarm_topic_arn" {
  description = "SNS topic for alarms and cost notices. Null if there is none."
  value       = local.alarm_topic_arn
}

output "ecs_cluster" {
  description = "ECS cluster: arn, name and kms_key_arn (ECS Exec). Null without compute."
  value = var.compute_enabled ? {
    arn         = module.ecs_cluster[0].cluster_arn
    name        = module.ecs_cluster[0].cluster_name
    kms_key_arn = module.ecs_cluster[0].kms_key_arn
  } : null
}

output "compute_logs_kms_key_arn" {
  description = "CMK for the logs, environment variables and async DLQs of the services (Fargate and Lambda). Null without compute."
  value       = var.compute_enabled ? module.compute_logs_kms[0].arn : null
}

output "observability" {
  description = "OpenObserve: OTLP endpoint, authorization secret, CMK and security group of the internal ALB. Null without observability."
  value = length(module.observability) == 0 ? null : {
    otlp_endpoint                 = module.observability[0].otlp_http_endpoint
    otlp_authorization_value_from = module.observability[0].otlp_authorization_value_from
    kms_key_arn                   = module.observability[0].kms_key_arn
    alb_security_group_id         = module.observability[0].alb_security_group_id
    alb_port                      = module.observability[0].alb_port
    console_url                   = module.observability[0].console_url
  }
}

output "http_api" {
  description = "Shared HTTP API: id, execution_arn, endpoint_host (CloudFront origin), authorizer_id, origin_verify_secret_arn and vpc_link_id. Null without compute."
  value = var.compute_enabled ? {
    id                       = module.http_api[0].api_id
    execution_arn            = module.http_api[0].execution_arn
    endpoint_host            = module.http_api[0].endpoint_host
    authorizer_id            = module.http_api[0].authorizer_id
    origin_verify_secret_arn = module.http_api[0].origin_verify_secret_arn
    origin_verify_kms_arn    = module.http_api[0].kms_key_arn
    vpc_link_id              = module.http_api[0].vpc_link_id
  } : null
}

output "api_alb" {
  description = "Internal ALB for the Fargate APIs: listener_arn and security_group_id. Null if fargate_api_enabled is false."
  value = local.api_alb_enabled ? {
    listener_arn      = module.api_alb[0].listener_arn
    security_group_id = module.api_alb[0].security_group_id
  } : null
}

output "realtime_alb" {
  description = "Public realtime ALB: listener_arn, security_group_id, dns_name and zone_id. Null without a certificate."
  value = local.realtime_alb_enabled ? {
    listener_arn      = module.realtime_alb[0].listener_arn
    security_group_id = module.realtime_alb[0].security_group_id
    dns_name          = module.realtime_alb[0].dns_name
    zone_id           = module.realtime_alb[0].zone_id
  } : null
}

output "files_bucket" {
  description = "User files bucket: name, arn, kms_key_arn and read_write_policy_json. Null if it was not created."
  value = length(module.files_bucket) == 0 ? null : {
    name                   = module.files_bucket[0].bucket_id
    arn                    = module.files_bucket[0].bucket_arn
    kms_key_arn            = module.files_bucket[0].kms_key_arn
    read_write_policy_json = module.files_bucket[0].read_write_policy_json
  }
}

output "ses" {
  description = "SES: events_topic_arn, events_kms_key_arn, send_policy_json and configuration_set_names. Null without ses_domain."
  value = length(module.ses) == 0 ? null : {
    events_topic_arn        = module.ses[0].events_topic_arn
    events_kms_key_arn      = module.ses[0].events_kms_key_arn
    send_policy_json        = module.ses[0].send_policy_json
    configuration_set_names = module.ses[0].configuration_set_names
  }
}

output "ses_dns_records" {
  description = "SES DNS records you must publish if you do not use route53_zone_id."
  value       = try(module.ses[0].dns_records, null)
}

output "github_oidc" {
  description = "GitHub Actions access through OIDC: provider_arn, deploy_role_arn, publish_role_arn, web_role_arn, artifacts_bucket and ecr_repository_prefix. Null without github_repository."
  value = length(module.oidc_github) == 0 ? null : {
    provider_arn          = module.oidc_github[0].provider_arn
    deploy_role_arn       = module.oidc_github[0].deploy_role_arn
    publish_role_arn      = module.oidc_github[0].publish_role_arn
    web_role_arn          = module.oidc_github[0].web_role_arn
    artifacts_bucket      = module.oidc_github[0].artifacts_bucket
    ecr_repository_prefix = module.oidc_github[0].ecr_repository_prefix
  }
}
