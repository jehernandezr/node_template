output "clients_security_group_id" {
  description = "Security group que adjuntan los servicios para llegar a RDS Proxy, las réplicas, Valkey y OpenObserve."
  value       = aws_security_group.clients.id
}

output "db" {
  description = "PostgreSQL: proxy_endpoint (escritura), reader_endpoints (réplicas, vacío sin réplicas), port, kms_key_arn y master_secret_arn (solo administración)."
  value = {
    proxy_endpoint    = module.rds.proxy_endpoint
    reader_endpoints  = module.rds.reader_endpoints
    port              = 5432
    kms_key_arn       = module.rds.kms_key_arn
    master_secret_arn = module.rds.master_secret_arn
    instance_endpoint = module.rds.endpoint
  }
}

output "db_service_secret_arns" {
  description = "ARN del secreto de cada usuario de base de datos, por nombre."
  value       = module.rds.service_secret_arns
}

output "service_databases" {
  description = "Por servicio, sus bases: shards (lista ordenada <servicio>_shard_<n>) y catalog (null sin acceso)."
  value       = local.service_databases
}

output "valkey" {
  description = "Valkey: endpoint, port, kms_key_arn, user_names y connect_resource_arns (por servicio)."
  value = {
    endpoint              = module.valkey.endpoint
    port                  = module.valkey.port
    kms_key_arn           = module.valkey.kms_key_arn
    user_names            = module.valkey.iam_user_names
    connect_resource_arns = module.valkey.connect_resource_arns
  }
}
