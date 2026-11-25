output "clients_security_group_id" {
  description = "Security group that services attach to reach RDS Proxy, the replicas, Valkey and OpenObserve."
  value       = aws_security_group.clients.id
}

output "db" {
  description = "PostgreSQL: proxy_endpoint (writes), reader_endpoints (replicas, empty without replicas), port, kms_key_arn and master_secret_arn (administration only)."
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
  description = "Secret ARN of each database user, by name."
  value       = module.rds.service_secret_arns
}

output "service_databases" {
  description = "Per service, its databases: shards (sorted list <service>_shard_<n>) and catalog (null without access)."
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
