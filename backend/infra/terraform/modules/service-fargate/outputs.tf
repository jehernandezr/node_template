output "service_name" {
  description = "Nombre del servicio ECS."
  value       = aws_ecs_service.this.name
}

output "service_arn" {
  description = "ARN del servicio ECS."
  value       = aws_ecs_service.this.id
}

output "task_definition_arn" {
  description = "ARN de la revisión vigente de la definición de tarea."
  value       = aws_ecs_task_definition.this.arn
}

output "task_role_arn" {
  description = "ARN del rol de la tarea."
  value       = aws_iam_role.task.arn
}

output "task_role_name" {
  description = "Nombre del rol de la tarea, para adjuntar políticas desde la raíz."
  value       = aws_iam_role.task.name
}

output "execution_role_arn" {
  description = "ARN del rol de ejecución."
  value       = aws_iam_role.execution.arn
}

output "security_group_id" {
  description = "Security group de las tareas. Pásalo a allowed_security_group_ids de RDS Proxy y Valkey."
  value       = aws_security_group.this.id
}

output "target_group_arn" {
  description = "ARN del target group. Null sin balanceador."
  value       = var.enable_load_balancer ? aws_lb_target_group.this[0].arn : null
}

output "target_group_arn_suffix" {
  description = "Sufijo del ARN del target group, para las dimensiones de CloudWatch. Null sin balanceador."
  value       = var.enable_load_balancer ? aws_lb_target_group.this[0].arn_suffix : null
}

output "log_group_name" {
  description = "Nombre del log group del servicio."
  value       = aws_cloudwatch_log_group.this.name
}

output "autoscaling_resource_id" {
  description = "ID del recurso de Application Auto Scaling."
  value       = aws_appautoscaling_target.this.resource_id
}
