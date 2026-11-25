output "arn" {
  description = "ARN of the load balancer."
  value       = aws_lb.this.arn
}

output "arn_suffix" {
  description = "ARN suffix, for CloudWatch dimensions."
  value       = aws_lb.this.arn_suffix
}

output "dns_name" {
  description = "DNS name of the load balancer."
  value       = aws_lb.this.dns_name
}

output "zone_id" {
  description = "Route 53 zone ID of the load balancer, for alias records."
  value       = aws_lb.this.zone_id
}

output "security_group_id" {
  description = "Security group of the load balancer."
  value       = aws_security_group.this.id
}

output "listener_arn" {
  description = "ARN of the listener where services add their rules: HTTPS with a certificate, HTTP on an internal ALB without one."
  value       = local.tls ? aws_lb_listener.https[0].arn : aws_lb_listener.http.arn
}

output "listener_port" {
  description = "Port of the services listener."
  value       = local.listener_port
}

output "https_listener_arn" {
  description = "ARN of the HTTPS listener. Null without a certificate."
  value       = try(aws_lb_listener.https[0].arn, null)
}

output "http_listener_arn" {
  description = "ARN of the HTTP listener: redirects to HTTPS with a certificate, and serves inside the VPC without one."
  value       = aws_lb_listener.http.arn
}

output "target_group_arns" {
  description = "ARN of each target group declared in target_groups, by key."
  value       = { for k, tg in aws_lb_target_group.this : k => tg.arn }
}

output "access_logs_bucket" {
  description = "Name of the S3 access logs bucket."
  value       = aws_s3_bucket.logs.id
}
