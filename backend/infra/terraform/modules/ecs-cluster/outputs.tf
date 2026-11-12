output "cluster_arn" {
  description = "ARN del clúster ECS."
  value       = aws_ecs_cluster.this.arn
}

output "cluster_name" {
  description = "Nombre del clúster ECS."
  value       = aws_ecs_cluster.this.name
}

output "cluster_id" {
  description = "ID del clúster ECS."
  value       = aws_ecs_cluster.this.id
}

output "kms_key_arn" {
  description = "ARN de la clave KMS que cifra los logs de ECS Exec."
  value       = local.kms_key_arn
}

output "exec_log_group_name" {
  description = "Nombre del log group de ECS Exec."
  value       = aws_cloudwatch_log_group.exec.name
}
