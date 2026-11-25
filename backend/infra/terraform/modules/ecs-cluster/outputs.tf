output "cluster_arn" {
  description = "ARN of the ECS cluster."
  value       = aws_ecs_cluster.this.arn
}

output "cluster_name" {
  description = "Name of the ECS cluster."
  value       = aws_ecs_cluster.this.name
}

output "cluster_id" {
  description = "ID of the ECS cluster."
  value       = aws_ecs_cluster.this.id
}

output "kms_key_arn" {
  description = "ARN of the KMS key that encrypts the ECS Exec logs."
  value       = local.kms_key_arn
}

output "exec_log_group_name" {
  description = "Name of the ECS Exec log group."
  value       = aws_cloudwatch_log_group.exec.name
}
