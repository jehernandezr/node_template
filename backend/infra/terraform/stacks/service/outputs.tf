output "api_routes" {
  description = "Rutas del servicio en la API compartida."
  value       = try(module.api_routes[0].route_keys, [])
}

output "api_runtime" {
  description = "Runtime de la API: lambda, fargate o null."
  value       = try(var.api.runtime, null)
}

output "lambda_functions" {
  description = "Funciones Lambda del servicio (API y consumidores): nombre y rol."
  value = merge(
    { for m in module.api_lambda : "api" => { name = m.function_name, role_arn = m.role_arn } },
    { for k, m in module.consumer : k => { name = m.function_name, role_arn = m.role_arn } },
  )
}

output "ecs_services" {
  description = "Servicios ECS del servicio (API, tiempo real y workers): nombre, rol de tarea y log group."
  value = merge(
    { for m in module.api_fargate : "api" => { name = m.service_name, task_role_arn = m.task_role_arn, log_group_name = m.log_group_name } },
    { for m in module.realtime : "realtime" => { name = m.service_name, task_role_arn = m.task_role_arn, log_group_name = m.log_group_name } },
    { for k, m in module.worker : k => { name = m.service_name, task_role_arn = m.task_role_arn, log_group_name = m.log_group_name } },
  )
}
