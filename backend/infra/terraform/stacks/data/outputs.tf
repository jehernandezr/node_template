output "clients_security_group_id" {
  description = "Security group that services attach to reach RDS Proxy, the replicas, Valkey and OpenObserve."
  value       = aws_security_group.clients.id
}

output "db" {
  description = "PostgreSQL: proxy_endpoint (writes, IAM authentication), reader_endpoints (replicas, empty without replicas), port, kms_key_arn and master_secret_arn (administration only)."
  value = {
    proxy_endpoint    = module.rds.proxy_endpoint
    reader_endpoints  = module.rds.reader_endpoints
    port              = 5432
    kms_key_arn       = module.rds.kms_key_arn
    master_secret_arn = module.rds.master_secret_arn
    instance_endpoint = module.rds.endpoint
  }
}

output "db_secret_arns" {
  description = "Secret ARN of each password database user (owner, app and replication), by name. Only RDS Proxy, the rotation and the bootstrap read them; services authenticate with IAM."
  value       = module.rds.service_secret_arns
}

output "db_roles" {
  description = "Per service, its database roles: owner (migrations), app (the service) and reader (the replicas)."
  value       = local.db_roles
}

output "db_connect_arns" {
  description = "Per service, the rds-db:connect resources of each role: app and owner through RDS Proxy, reader on each replica."
  value       = local.db_connect_arns
}

output "service_databases" {
  description = "Per service, its databases: shards (sorted list <service>_shard_<n>) and catalog (<service>_catalog)."
  value       = local.service_databases
}

output "valkey" {
  description = "Valkey: endpoint, port, cache_name (IAM token host), kms_key_arn, user_names and connect_resource_arns (per service)."
  value = {
    endpoint              = module.valkey.endpoint
    cache_name            = module.valkey.cache_name
    port                  = module.valkey.port
    kms_key_arn           = module.valkey.kms_key_arn
    user_names            = module.valkey.iam_user_names
    connect_resource_arns = module.valkey.connect_resource_arns
  }
}
