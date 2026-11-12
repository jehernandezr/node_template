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

output "reader_endpoint" {
  description = "Endpoint del RDS Proxy de lectura (primera réplica). Null sin réplicas. Es el que usan las apps para leer."
  value       = module.rds.reader_endpoint
}

output "rds_reader_endpoints" {
  description = "Endpoints de los proxies de lectura, uno por réplica."
  value       = module.rds.reader_endpoints
}

output "rds_replica_endpoints" {
  description = "Endpoints directos de las réplicas. Solo administración."
  value       = module.rds.replica_endpoints
}

output "rds_master_secret_arn" {
  description = "ARN del secreto del usuario maestro. Solo administración: las apps no lo usan."
  value       = module.rds.master_secret_arn
}

output "rds_service_secret_arns" {
  description = "ARN del secreto de cada usuario de servicio."
  value       = module.rds.service_secret_arns
}

output "rds_kms_key_arn" {
  description = "ARN de la clave KMS de RDS y sus secretos."
  value       = module.rds.kms_key_arn
}

output "data_subnet_ids" {
  description = "Subredes de datos, sin ruta a Internet."
  value       = module.network.data_subnet_ids
}

output "nat_public_ips" {
  description = "IPs públicas de salida de las apps, para listas de permitidos de proveedores externos."
  value       = module.network.nat_public_ips
}

output "flow_log_group_name" {
  description = "Grupo de CloudWatch Logs de los flow logs."
  value       = module.network.flow_log_group_name
}

output "alarm_topic_arn" {
  description = "ARN del tópico SNS que recibe las alarmas. Null si no hay."
  value       = local.alarm_topic_arn
}

output "valkey_connect_resource_arns" {
  description = "Por servicio, los ARN para elasticache:Connect (autenticación IAM de Valkey)."
  value       = module.valkey.connect_resource_arns
}

output "valkey_iam_user_names" {
  description = "Usuario Valkey de cada servicio, con el que se firma el token IAM."
  value       = module.valkey.iam_user_names
}

output "valkey_kms_key_arn" {
  description = "ARN de la clave KMS de Valkey."
  value       = module.valkey.kms_key_arn
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
