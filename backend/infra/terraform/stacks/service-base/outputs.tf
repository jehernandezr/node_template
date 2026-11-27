output "service_name" {
  description = "Service these resources belong to."
  value       = local.svc
}

output "components" {
  description = "Each component by key (api, realtime, worker-<key>, consumer-<key>, one-off): name, runtime, queue, the role it runs with (role_arn, role_name), the ECS execution role, log group, security group and its own variables (FILES_BUCKET, QUEUE_URL)."
  value = {
    for key, c in local.components : key => {
      name               = c.name
      runtime            = c.runtime
      queue              = c.queue
      role_arn           = module.component[key].role_arn
      role_name          = module.component[key].role_name
      execution_role_arn = module.component[key].execution_role_arn
      log_group_name     = module.component[key].log_group_name
      security_group_id  = module.component[key].security_group_id
      environment        = local.component_environment[key]
    }
  }
}

output "fargate_environment" {
  description = "Environment shared by every Fargate task of the service: the adapter contract, DB_*, VALKEY_* and the service's own variables."
  value       = local.fargate_environment
}

output "lambda_environment" {
  description = "Environment shared by every function of the service: the Fargate one without AWS_REGION, plus DB_SECRET_ARN."
  value       = local.lambda_environment
}

output "fargate_secrets" {
  description = "Secrets of the Fargate tasks: variable name to valueFrom."
  value       = local.fargate_secrets
}

output "lambda_secret_arns" {
  description = "Secrets the functions read at startup."
  value       = local.lambda_secrets
}

output "kms_key_arn" {
  description = "CMK of the logs, and of the environment variables and async DLQs of the functions."
  value       = local.logs_kms_key_arn
}

output "data_security_group_ids" {
  description = "Security groups that open the database, Valkey and OpenObserve to the components."
  value       = local.data_security_group_ids
}

output "enable_execute_command" {
  description = "Whether the task roles may use ECS Exec, so the service stack enables it on the ECS services."
  value       = var.enable_execute_command
}

output "one_off_task" {
  description = "What the pipeline needs to register and run the one-off task (migrate, signing-keys, seed) with the new image: cluster, subnets, security groups, roles, log group, size, environment and secrets. The environment is the one every Fargate task of the service gets."
  value = {
    cluster_arn        = try(local.platform.ecs_cluster.arn, null)
    subnet_ids         = local.network.private_subnet_ids
    security_group_ids = concat([module.component["one-off"].security_group_id], local.data_security_group_ids)
    task_role_arn      = module.component["one-off"].role_arn
    execution_role_arn = module.component["one-off"].execution_role_arn
    log_group_name     = module.component["one-off"].log_group_name
    cpu                = var.one_off_task.cpu
    memory             = var.one_off_task.memory
    environment        = local.fargate_environment
    secrets            = local.fargate_secrets
  }
}
