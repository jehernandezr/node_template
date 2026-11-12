output "ecs_cluster_arn" {
  description = "ARN del clúster ECS."
  value       = module.ecs_cluster.cluster_arn
}

output "ecs_cluster_name" {
  description = "Nombre del clúster ECS."
  value       = module.ecs_cluster.cluster_name
}

output "alb_dns_name" {
  description = "DNS del ALB público. Null si no hay ALB."
  value       = try(module.alb[0].dns_name, null)
}

output "alb_security_group_id" {
  description = "Security group del ALB público. Null si no hay ALB."
  value       = try(module.alb[0].security_group_id, null)
}

output "observability_otlp_endpoint" {
  description = "Endpoint OTLP HTTP de OpenObserve. Null sin observabilidad."
  value       = local.obs_endpoint
}

output "observability_console_url" {
  description = "URL de la consola de OpenObserve. Null sin observabilidad."
  value       = try(module.observability[0].console_url, null)
}

output "web_bucket_name" {
  description = "Bucket del build de Flutter web. Null sin CloudFront."
  value       = try(module.cloudfront_waf[0].web_bucket_name, null)
}

output "web_distribution_id" {
  description = "ID de la distribución de la web, para invalidaciones. Null sin CloudFront."
  value       = try(module.cloudfront_waf[0].web_distribution_id, null)
}

output "web_kms_key_arn" {
  description = "Clave KMS del bucket web, para el pipeline de publicación."
  value       = try(module.cloudfront_waf[0].web_kms_key_arn, null)
}

output "cloudfront_web_domain_name" {
  description = "Dominio de la distribución de la web."
  value       = try(module.cloudfront_waf[0].web_domain_name, null)
}

output "cloudfront_api_domain_name" {
  description = "Dominio de la distribución de la API."
  value       = try(module.cloudfront_waf[0].api_domain_name, null)
}

output "web_acl_arn" {
  description = "ARN del WAF de CloudFront."
  value       = try(module.cloudfront_waf[0].web_acl_arn, null)
}

output "files_bucket_name" {
  description = "Bucket de archivos de los usuarios. Null si no se creó."
  value       = try(module.files_bucket[0].bucket_id, null)
}

output "ses_dns_records" {
  description = "Registros DNS de SES que debes publicar si no usas route53_zone_id."
  value       = try(module.ses[0].dns_records, null)
}

output "ses_configuration_set_names" {
  description = "Configuration sets de SES (tracked y security)."
  value       = try(module.ses[0].configuration_set_names, null)
}

output "ses_events_queue_arn" {
  description = "ARN de la cola de eventos de SES (seguimiento de correo)."
  value       = try(aws_sqs_queue.ses_events[0].arn, null)
}

output "ses_events_queue_url" {
  description = "URL de la cola de eventos de SES."
  value       = try(aws_sqs_queue.ses_events[0].url, null)
}

output "fargate_services" {
  description = "Por servicio Fargate: nombre, rol de tarea y security group."
  value = {
    for k, m in module.service_fargate : k => {
      service_name      = m.service_name
      task_role_arn     = m.task_role_arn
      security_group_id = m.security_group_id
      log_group_name    = m.log_group_name
    }
  }
}

output "lambda_services" {
  description = "Por servicio Lambda: ARN y rol."
  value = {
    for k, m in module.service_lambda : k => {
      function_arn = m.function_arn
      role_arn     = m.role_arn
    }
  }
}
