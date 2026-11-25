output "api_routes" {
  description = "Routes of the service in the shared API."
  value       = try(module.api_routes[0].route_keys, [])
}

output "api_runtime" {
  description = "API runtime: lambda, fargate or null."
  value       = try(var.api.runtime, null)
}

output "lambda_functions" {
  description = "Lambda functions of the service (API and consumers): name and role."
  value = merge(
    { for m in module.api_lambda : "api" => { name = m.function_name, role_arn = m.role_arn } },
    { for k, m in module.consumer : k => { name = m.function_name, role_arn = m.role_arn } },
  )
}

output "ecs_services" {
  description = "ECS services of the service (API, realtime and workers): name, task role and log group."
  value = merge(
    { for m in module.api_fargate : "api" => { name = m.service_name, task_role_arn = m.task_role_arn, log_group_name = m.log_group_name } },
    { for m in module.realtime : "realtime" => { name = m.service_name, task_role_arn = m.task_role_arn, log_group_name = m.log_group_name } },
    { for k, m in module.worker : k => { name = m.service_name, task_role_arn = m.task_role_arn, log_group_name = m.log_group_name } },
  )
}
