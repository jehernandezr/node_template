output "arn" {
  description = "ARN del balanceador."
  value       = aws_lb.this.arn
}

output "arn_suffix" {
  description = "Sufijo del ARN, para las dimensiones de CloudWatch."
  value       = aws_lb.this.arn_suffix
}

output "dns_name" {
  description = "Nombre DNS del balanceador."
  value       = aws_lb.this.dns_name
}

output "zone_id" {
  description = "ID de zona Route 53 del balanceador, para registros alias."
  value       = aws_lb.this.zone_id
}

output "security_group_id" {
  description = "Security group del balanceador."
  value       = aws_security_group.this.id
}

output "listener_arn" {
  description = "ARN del listener donde los servicios agregan sus reglas: HTTPS con certificado, HTTP en un ALB interno sin certificado."
  value       = local.tls ? aws_lb_listener.https[0].arn : aws_lb_listener.http.arn
}

output "listener_port" {
  description = "Puerto del listener de los servicios."
  value       = local.listener_port
}

output "https_listener_arn" {
  description = "ARN del listener HTTPS. Null sin certificado."
  value       = try(aws_lb_listener.https[0].arn, null)
}

output "http_listener_arn" {
  description = "ARN del listener HTTP: redirige a HTTPS con certificado y atiende dentro de la VPC sin él."
  value       = aws_lb_listener.http.arn
}

output "target_group_arns" {
  description = "ARN de cada target group declarado en target_groups, por clave."
  value       = { for k, tg in aws_lb_target_group.this : k => tg.arn }
}

output "access_logs_bucket" {
  description = "Nombre del bucket S3 de access logs."
  value       = aws_s3_bucket.logs.id
}
