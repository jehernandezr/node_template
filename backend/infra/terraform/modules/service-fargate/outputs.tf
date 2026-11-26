output "service_name" {
  description = "ECS service name."
  value       = aws_ecs_service.this.name
}

output "service_arn" {
  description = "ECS service ARN."
  value       = aws_ecs_service.this.id
}

output "task_definition_arn" {
  description = "ARN of the current task definition revision."
  value       = aws_ecs_task_definition.this.arn
}

output "task_role_arn" {
  description = "Task role ARN."
  value       = aws_iam_role.task.arn
}

output "task_role_name" {
  description = "Task role name, for attaching policies from the root module."
  value       = aws_iam_role.task.name
}

output "execution_role_arn" {
  description = "Execution role ARN."
  value       = aws_iam_role.execution.arn
}

output "security_group_id" {
  description = "Task security group. Pass it to allowed_security_group_ids of RDS Proxy and Valkey."
  value       = aws_security_group.this.id
}

output "target_group_arn" {
  description = "Target group ARN. Null without a load balancer."
  value       = var.enable_load_balancer ? aws_lb_target_group.this[0].arn : null
}

output "target_group_arn_suffix" {
  description = "Target group ARN suffix, for CloudWatch dimensions. Null without a load balancer."
  value       = var.enable_load_balancer ? aws_lb_target_group.this[0].arn_suffix : null
}

output "target_group_name_prefix" {
  description = "Prefix of the target group name. AWS completes it with a unique suffix, so a replacement can be created before the old one is destroyed."
  value       = var.enable_load_balancer ? aws_lb_target_group.this[0].name_prefix : null
}

output "listener_rule_priority" {
  description = "Priority of the listener rule. Null without a load balancer."
  value       = var.enable_load_balancer ? aws_lb_listener_rule.this[0].priority : null
}

output "min_capacity" {
  description = "Autoscaling minimum task count."
  value       = aws_appautoscaling_target.this.min_capacity
}

output "max_capacity" {
  description = "Autoscaling maximum task count."
  value       = aws_appautoscaling_target.this.max_capacity
}

output "log_group_name" {
  description = "Service log group name."
  value       = aws_cloudwatch_log_group.this.name
}

output "autoscaling_resource_id" {
  description = "Application Auto Scaling resource ID."
  value       = aws_appautoscaling_target.this.resource_id
}
