output "api_routes" {
  description = "Routes of the service in the shared API."
  value       = try(module.api_routes[0].route_keys, [])
}

output "api_runtime" {
  description = "API runtime from service-base: lambda, fargate or null."
  value       = var.api == null ? null : local.component["api"].runtime
}

output "lambda_functions" {
  description = "Lambda functions of the service (API and consumers): name and role."
  value = merge(
    { for m in module.api_lambda : "api" => { name = m.function_name, role_arn = local.component["api"].role_arn } },
    { for k, m in module.consumer : k => { name = m.function_name, role_arn = local.component["consumer-${k}"].role_arn } },
  )
}

output "ecs_services" {
  description = "ECS services of the service (API, realtime and workers): name, task role and log group."
  value = merge(
    { for m in module.api_fargate : "api" => { name = m.service_name, task_role_arn = local.component["api"].role_arn, log_group_name = local.component["api"].log_group_name } },
    { for m in module.realtime : "realtime" => { name = m.service_name, task_role_arn = local.component["realtime"].role_arn, log_group_name = local.component["realtime"].log_group_name } },
    { for k, m in module.worker : k => { name = m.service_name, task_role_arn = local.component["worker-${k}"].role_arn, log_group_name = local.component["worker-${k}"].log_group_name } },
  )
}
