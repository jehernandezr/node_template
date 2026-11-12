output "vpc_id" {
  description = "ID de la VPC."
  value       = module.network.vpc_id
}

output "private_subnet_ids" {
  description = "Subredes privadas."
  value       = module.network.private_subnet_ids
}

output "clients_security_group_id" {
  description = "Security group que adjuntan los servicios para usar RDS Proxy, Valkey y AWS."
  value       = aws_security_group.clients.id
}

output "rds_endpoint" {
  description = "Endpoint directo de RDS."
  value       = module.rds.endpoint
}

output "rds_proxy_endpoint" {
  description = "Endpoint del RDS Proxy que usan las aplicaciones."
  value       = module.rds.proxy_endpoint
}

output "rds_replica_endpoints" {
  description = "Endpoints de las réplicas de lectura."
  value       = module.rds.replica_endpoints
}

output "rds_secret_arn" {
  description = "ARN del secreto con las credenciales maestras."
  value       = module.rds.secret_arn
}

output "valkey_endpoint" {
  description = "Host de la caché Valkey."
  value       = module.valkey.endpoint
}

output "valkey_port" {
  description = "Puerto de la caché Valkey."
  value       = module.valkey.port
}

output "topic_arns" {
  description = "ARN de los tópicos SNS."
  value       = module.messaging.topic_arns
}

output "queue_urls" {
  description = "URL de las colas SQS."
  value       = module.messaging.queue_urls
}

output "queue_arns" {
  description = "ARN de las colas SQS."
  value       = module.messaging.queue_arns
}

output "dlq_arns" {
  description = "ARN de las DLQ."
  value       = module.messaging.dlq_arns
}

output "messaging_kms_key_arn" {
  description = "ARN de la clave KMS de mensajería."
  value       = module.messaging.kms_key_arn
}
