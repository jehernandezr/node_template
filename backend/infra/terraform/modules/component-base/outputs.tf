output "runtime" {
  description = "fargate or lambda."
  value       = var.runtime
}

output "role_arn" {
  description = "ARN of the role the code runs with: the task role on Fargate, the function role on Lambda."
  value       = local.fargate ? aws_iam_role.task[0].arn : aws_iam_role.function[0].arn
}

output "role_name" {
  description = "Name of that role, to attach the runtime policies."
  value       = local.fargate ? aws_iam_role.task[0].name : aws_iam_role.function[0].name
}

output "execution_role_arn" {
  description = "ARN of the ECS execution role. Null on Lambda."
  value       = local.fargate ? aws_iam_role.execution[0].arn : null
}

output "execution_role_name" {
  description = "Name of the ECS execution role, known at plan time, for the resource policies that name it. Null on Lambda."
  value       = local.fargate ? aws_iam_role.execution[0].name : null
}

output "log_group_name" {
  description = "Name of the log group."
  value       = aws_cloudwatch_log_group.this.name
}

output "security_group_id" {
  description = "Security group of the tasks or the function, with HTTPS-only egress."
  value       = aws_security_group.this.id
}

output "kms_key_arn" {
  description = "CMK of the logs, and on Lambda of the environment variables and the async DLQ."
  value       = local.kms_key_arn
}
