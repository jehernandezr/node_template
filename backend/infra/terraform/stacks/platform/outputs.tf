output "alarm_topic_arn" {
  description = "Tópico SNS de alarmas y avisos de costo. Null si no hay."
  value       = local.alarm_topic_arn
}

output "ecs_cluster" {
  description = "Clúster ECS: arn, name y kms_key_arn (ECS Exec). Null sin cómputo."
  value = var.compute_enabled ? {
    arn         = module.ecs_cluster[0].cluster_arn
    name        = module.ecs_cluster[0].cluster_name
    kms_key_arn = module.ecs_cluster[0].kms_key_arn
  } : null
}

output "observability" {
  description = "OpenObserve: endpoint OTLP, secreto de autorización, CMK y security group del ALB interno. Null sin observabilidad."
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
  description = "API HTTP compartida: id, execution_arn, endpoint_host (origen de CloudFront), authorizer_id, origin_verify_secret_arn y vpc_link_id. Null sin cómputo."
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
  description = "ALB interno de las APIs en Fargate: listener_arn y security_group_id. Null si fargate_api_enabled es false."
  value = local.api_alb_enabled ? {
    listener_arn      = module.api_alb[0].listener_arn
    security_group_id = module.api_alb[0].security_group_id
  } : null
}

output "realtime_alb" {
  description = "ALB público de tiempo real: listener_arn, security_group_id, dns_name y zone_id. Null sin certificado."
  value = local.realtime_alb_enabled ? {
    listener_arn      = module.realtime_alb[0].listener_arn
    security_group_id = module.realtime_alb[0].security_group_id
    dns_name          = module.realtime_alb[0].dns_name
    zone_id           = module.realtime_alb[0].zone_id
  } : null
}

output "files_bucket" {
  description = "Bucket de archivos de usuarios: name, arn, kms_key_arn y read_write_policy_json. Null si no se creó."
  value = length(module.files_bucket) == 0 ? null : {
    name                   = module.files_bucket[0].bucket_id
    arn                    = module.files_bucket[0].bucket_arn
    kms_key_arn            = module.files_bucket[0].kms_key_arn
    read_write_policy_json = module.files_bucket[0].read_write_policy_json
  }
}

output "ses" {
  description = "SES: events_topic_arn, events_kms_key_arn, send_policy_json y configuration_set_names. Null sin ses_domain."
  value = length(module.ses) == 0 ? null : {
    events_topic_arn        = module.ses[0].events_topic_arn
    events_kms_key_arn      = module.ses[0].events_kms_key_arn
    send_policy_json        = module.ses[0].send_policy_json
    configuration_set_names = module.ses[0].configuration_set_names
  }
}

output "ses_dns_records" {
  description = "Registros DNS de SES que debes publicar si no usas route53_zone_id."
  value       = try(module.ses[0].dns_records, null)
}
