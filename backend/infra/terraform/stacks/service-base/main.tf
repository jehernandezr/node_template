# What a service needs before it runs (ADR 0043): the roles, log groups and security groups of each of its
# components and of its one-off task, and the environment they share. The service stack reads all of it through
# remote state and runs the components; the pipeline runs migrate from migrate_task, seed from one_off_task and, for
# identity, signing-keys from signing_keys_task before applying the service stack. The secrets live in secrets.tf.

data "aws_caller_identity" "current" {}

locals {
  svc  = var.service_name
  name = replace(var.service_name, "_", "-")

  # Topics and queues according to the producers and consumer of the exported topology.
  access = try(local.messaging.service_access[local.svc], {
    publish_topics = []
    send_queues    = []
    consume_queues = []
  })
  component_queues = concat([for w in values(var.workers) : w.queue if w.queue != null], [for c in values(var.consumers) : c.queue])

  databases     = try(local.data.service_databases[local.svc], null)
  db_roles      = var.database_access ? try(local.data.db_roles[local.svc], null) : null
  db_connect    = var.database_access ? try(local.data.db_connect_arns[local.svc], null) : null
  valkey_user   = try(local.data.valkey.user_names[local.svc], null)
  observability = local.platform.observability

  # The region this stack serves, by its code in var.regions (ADR 0042).
  region_codes = [for code, r in var.regions : code if r.aws_region == var.region]
  region_code  = one(local.region_codes)
  issuer       = try(var.regions[local.region_code].issuer, null)
  regions_json = jsonencode([for code in sort(keys(var.regions)) : {
    code       = code
    apiBaseUrl = var.regions[code].api_base_url
    issuer     = var.regions[code].issuer
  }])

  # The one physical instance of the region: RDS Proxy as the primary and the replicas, read directly.
  db_instance = "main"
  db_primary  = { host = local.data.db.proxy_endpoint, port = local.data.db.port }
  db_instances = jsonencode({
    (local.db_instance) = {
      primary  = local.db_primary
      replicas = [for host in local.data.db.reader_endpoints : { host = host, port = local.data.db.port }]
    }
  })
  db_primary_instances = jsonencode({ (local.db_instance) = { primary = local.db_primary, replicas = [] } })

  # Contract with the @platform adapters: the names of these variables are the ones their
  # configuration schemas validate. The service's own variables go first,
  # so they cannot override the contract.
  common_environment = merge(
    var.environment_variables,
    {
      SERVICE_NAME          = local.svc
      DEPLOY_ENVIRONMENT    = var.environment
      MESSAGING_NAME_PREFIX = local.messaging.name_prefix
      # The AWS adapter builds the topic ARNs without calling STS.
      AWS_ACCOUNT_ID = data.aws_caller_identity.current.account_id
      REGIONS        = local.regions_json
      SERVICE_REGION = local.region_code
      AUTH_ISSUER    = local.issuer
    },
    length(var.web_origins) == 0 ? {} : { WEB_ORIGINS = join(",", var.web_origins) },
    local.svc == "identity" ? { IDENTITY_REGION = local.region_code, IDENTITY_ISSUER = local.issuer } : {},
    # The pool signs an IAM token per connection (ADR 0041): the app role writes through RDS Proxy and the reader
    # role reads the replicas. The names are the keys of databaseConfigSchema (database-config.json).
    var.database_access ? {
      DB_AUTH                 = "iam"
      DB_USER                 = try(local.db_roles.app, null)
      DB_READER_USER          = try(local.db_roles.reader, null)
      DB_SSL                  = "true"
      DB_INSTANCES            = local.db_instances
      DB_CATALOG_INSTANCE     = local.db_instance
      DB_CATALOG_NAME         = try(local.databases.catalog, null)
      DB_POOL_MAX             = tostring(var.database_pool_max)
      DB_STATEMENT_TIMEOUT_MS = tostring(var.database_statement_timeout_ms)
      DB_CONNECT_TIMEOUT_MS   = tostring(var.database_connect_timeout_ms)
      # Tenant moves copy in batches; TENANT_MOVE_TARGETS stays unset so each shard's group follows the naming
      # convention of ADR 0032.
      TENANT_MOVE_STRATEGY = "batch"
    } : {},
    # Serverless Valkey requires TLS and IAM authentication: the client signs a token with its role
    # for VALKEY_CACHE_NAME and connects as VALKEY_USER. The ACL limits keys and channels to
    # VALKEY_KEY_PREFIX.
    local.valkey_user == null ? {} : {
      VALKEY_HOST       = local.data.valkey.endpoint
      VALKEY_PORT       = tostring(local.data.valkey.port)
      VALKEY_TLS        = "true"
      VALKEY_USER       = local.valkey_user
      VALKEY_AUTH       = "iam-serverless"
      VALKEY_CACHE_NAME = local.data.valkey.cache_name
      VALKEY_KEY_PREFIX = local.svc
    },
  )

  # Lambda sets AWS_REGION on its own (it is a reserved variable); Fargate does not
  # guarantee it on every platform version.
  fargate_environment = merge(local.common_environment, { AWS_REGION = var.region })
  lambda_environment  = merge(local.common_environment, length(local.fargate_secrets) == 0 ? {} : { SECRETS_MAP = jsonencode(local.fargate_secrets) })
  # Only the migrate task connects as the owner role (ADR 0041); the other one-off tasks and the components run as
  # the app role. The owner may connect only through RDS Proxy, so the migrate task gets no replica and no reader
  # role: its pools and its shard list stay on the primary.
  migrate_environment = merge(
    { for name, value in local.fargate_environment : name => value if !(var.database_access && name == "DB_READER_USER") },
    var.database_access ? { DB_USER = try(local.db_roles.owner, null), DB_INSTANCES = local.db_primary_instances } : {},
  )

  # --- Components ------------------------------------------------------------------
  # Each component gets only what it uses: the API and realtime do not consume queues, each
  # worker consumes only its own, and files and SES are requested per component. The migrate task reaches the
  # database as the owner role only; the one-off task (seed) reaches it as the app role. Both reach
  # Valkey and publish nothing. Consumer Lambdas get their queue permission in the service stack, with their event
  # source mapping.
  components = merge(
    var.api == null ? {} : {
      api = { name = "${local.name}-api", runtime = var.api.runtime, publish = true, queue = null, files = var.api.files_access, ses = var.api.ses_send }
    },
    var.realtime == null ? {} : {
      realtime = { name = "${local.name}-rt", runtime = "fargate", publish = var.realtime.publish, queue = null, files = var.realtime.files_access, ses = var.realtime.ses_send }
    },
    { for k, w in var.workers : "worker-${k}" => { name = "${local.name}-${replace(k, "_", "-")}", runtime = "fargate", publish = true, queue = w.queue, files = w.files_access, ses = w.ses_send } },
    { for k, c in var.consumers : "consumer-${k}" => { name = "${local.name}-${replace(k, "_", "-")}", runtime = "lambda", publish = true, queue = null, files = c.files_access, ses = c.ses_send } },
    { "one-off" = { name = "${local.name}-one-off", runtime = "fargate", publish = false, queue = null, files = false, ses = false } },
    { migrate = { name = "${local.name}-migrate", runtime = "fargate", publish = false, queue = null, files = false, ses = false } },
  )

  # The tasks the pipeline registers with the new image and runs once, each with its own role and environment.
  one_off_environments = {
    "one-off" = local.fargate_environment
    migrate   = local.migrate_environment
  }

  publish_statements = concat(
    length(local.access.publish_topics) == 0 ? [] : [{
      Sid      = "PublishTopics"
      Effect   = "Allow"
      Action   = ["sns:Publish"]
      Resource = [for t in local.access.publish_topics : local.messaging.topic_arns[t]]
    }],
    length(local.access.send_queues) == 0 ? [] : [{
      Sid      = "SendQueues"
      Effect   = "Allow"
      Action   = ["sqs:SendMessage", "sqs:GetQueueUrl"]
      Resource = [for q in local.access.send_queues : local.messaging.queue_arns[q]]
    }],
  )

  messaging_statements = {
    for key, c in local.components : key => concat(
      c.publish ? local.publish_statements : [],
      c.queue == null ? [] : [{
        Sid      = "ConsumeQueue"
        Effect   = "Allow"
        Action   = ["sqs:ReceiveMessage", "sqs:DeleteMessage", "sqs:ChangeMessageVisibility", "sqs:GetQueueAttributes", "sqs:GetQueueUrl"]
        Resource = [try(local.messaging.queue_arns[c.queue], "")]
      }],
    )
  }

  policies = {
    for key, c in local.components : key => merge(
      length(local.messaging_statements[key]) == 0 ? {} : {
        messaging = jsonencode({
          Version = "2012-10-17"
          Statement = concat(local.messaging_statements[key], [{
            Sid      = "MessagingKey"
            Effect   = "Allow"
            Action   = ["kms:GenerateDataKey", "kms:Decrypt"]
            Resource = local.messaging.kms_key_arn
          }])
        })
      },
      local.valkey_user == null ? {} : {
        valkey-connect = jsonencode({
          Version = "2012-10-17"
          Statement = [{
            Effect   = "Allow"
            Action   = ["elasticache:Connect"]
            Resource = local.data.valkey.connect_resource_arns[local.svc]
          }]
        })
      },
      local.db_connect == null ? {} : {
        database-connect = jsonencode({
          Version = "2012-10-17"
          Statement = [{
            Effect   = "Allow"
            Action   = ["rds-db:connect"]
            Resource = key == "migrate" ? local.db_connect.owner : concat(local.db_connect.app, local.db_connect.reader)
          }]
        })
      },
      key == "one-off" && local.identity ? { signing-keys = local.signing_keys_policy } : {},
      c.files ? { files = try(local.platform.files_bucket.read_write_policy_json, "") } : {},
      c.ses ? { ses-send = try(local.platform.ses.send_policy_json, "") } : {},
      var.task_policies,
    )
  }

  # Variables of one component only: the files bucket where it asked for it and the queue of a worker.
  component_environment = {
    for key, c in local.components : key => merge(
      c.files ? { FILES_BUCKET = try(local.platform.files_bucket.name, "") } : {},
      c.queue == null ? {} : { QUEUE_URL = try(local.messaging.queue_urls[c.queue], "") },
    )
  }

  secret_kms_keys = distinct(concat(
    var.secrets_kms_key_arns,
    [for key in module.secrets_kms : key.arn],
    local.observability == null ? [] : [local.observability.kms_key_arn],
  ))

  # Fargate gets each secret through valueFrom; Lambda gets SECRETS_MAP with the same names and ARNs and reads them
  # at startup (ADR 0041). The Fargate execution roles also read the OpenObserve authorization for the collector
  # sidecar, and the one-off execution role the smoke account its seed receives. No database secret: the pool signs
  # IAM tokens with the component role.
  fargate_secrets         = merge(var.secrets, local.stack_secrets)
  fargate_execution_reads = concat(values(local.fargate_secrets), local.observability == null ? [] : [local.observability.otlp_authorization_value_from])
  lambda_secrets          = distinct([for v in values(local.fargate_secrets) : regex("^arn:[^:]+:secretsmanager:[^:]+:[0-9]{12}:secret:[^:]+", v)])
  one_off_task_secrets    = merge(local.fargate_secrets, local.one_off_secrets)
  data_security_group_ids = [local.data.clients_security_group_id]
  running_dropped         = [for key in local.service.components : key if !contains(keys(local.components), key)]
  service_state_found     = local.service.service_name != null
  service_applied         = local.service_state_found || local.previous.service_applied

  component_names_distinct = length(distinct([for c in values(local.components) : c.name])) == length(local.components)

  # One logs CMK per environment for all compute (platform stack).
  logs_kms_key_arn = local.platform.compute_logs_kms_key_arn

  # Outputs one_off_task and migrate_task: what the pipeline needs to register and run each with the new image.
  one_off_tasks = {
    for key, environment in local.one_off_environments : key => {
      cluster_arn        = try(local.platform.ecs_cluster.arn, null)
      subnet_ids         = local.network.private_subnet_ids
      security_group_ids = concat([module.component[key].security_group_id], local.data_security_group_ids)
      task_role_arn      = module.component[key].role_arn
      execution_role_arn = module.component[key].execution_role_arn
      log_group_name     = module.component[key].log_group_name
      cpu                = var.one_off_task.cpu
      memory             = var.one_off_task.memory
      environment        = environment
      secrets            = key == "one-off" ? local.one_off_task_secrets : local.fargate_secrets
    }
  }

  # The signing-keys task runs before the identity configuration is valid, so it gets only the region and the
  # container it fills, and no secret: ECS would not start a task whose secret has no value yet.
  signing_keys_task = local.identity ? merge(local.one_off_tasks["one-off"], {
    environment = {
      AWS_REGION                       = var.region
      IDENTITY_SIGNING_KEYS_SECRET_ARN = aws_secretsmanager_secret.signing_keys[0].arn
    }
    secrets = {}
  }) : null
}

# References to other stacks that variable validation cannot check.
resource "terraform_data" "service_check" {
  input = local.svc

  lifecycle {
    precondition {
      condition     = length(local.region_codes) == 1
      error_message = "The stack region ${var.region} must be the aws_region of exactly one entry of regions in common.tfvars."
    }
    precondition {
      condition     = local.component_names_distinct
      error_message = "Two components share a name: a worker or consumer key cannot repeat another one, nor be api, rt, one-off or migrate."
    }
    precondition {
      condition     = !local.service_state_found || local.service.service_name == local.svc
      error_message = "The service state at ${local.service_state_key} belongs to another service."
    }
    precondition {
      condition     = local.service_state_found || !local.previous.service_applied
      error_message = "The service stack was applied before, but its state is not found at ${local.service_state_key}, so the components it runs are unknown. Fix the key or the bucket; if the service stack was destroyed on purpose, destroy this stack too."
    }
    precondition {
      condition     = length(local.running_dropped) == 0
      error_message = "The service stack still runs a component this plan removes, and its role and security group cannot go while it runs. Remove it from services/<service>/terraform.tfvars and apply the service stack first, then apply service-base."
    }
    precondition {
      condition     = length(setintersection(keys(var.secrets), keys(local.stack_secrets))) == 0
      error_message = "A variable of secrets is one this stack already creates (generated_secrets, IDENTITY_SIGNING_KEYS)."
    }
    precondition {
      condition     = local.platform.ecs_cluster != null
      error_message = "The one-off task and the Fargate components need the ECS cluster of the platform stack, which exists with compute_enabled."
    }
    precondition {
      condition     = alltrue([for w in values(var.workers) : w.queue != null]) || length(local.access.consume_queues) == 0
      error_message = "A worker without queue polls every queue of the contract: give each worker its queue when the service consumes queues."
    }
    precondition {
      condition     = !var.database_access || (local.databases != null && local.db_roles != null && local.db_connect != null)
      error_message = "database_access needs the service in db_services of the data stack."
    }
    precondition {
      condition     = local.valkey_user != null
      error_message = "Every deployed service needs Valkey: add the service to valkey_services of the data stack."
    }
    precondition {
      condition     = alltrue([for q in local.component_queues : contains(keys(local.messaging.queue_arns), q)])
      error_message = "A worker or consumer uses a queue that is neither in the topology nor ses-events."
    }
    precondition {
      condition     = !anytrue([for c in values(local.components) : c.files]) || local.platform.files_bucket != null
      error_message = "files_access needs the files bucket (files_cors_allowed_origins in platform)."
    }
    precondition {
      condition     = !anytrue([for c in values(local.components) : c.ses]) || local.platform.ses != null
      error_message = "ses_send needs ses_domain in the platform stack."
    }
  }
}

module "component" {
  for_each = local.components
  source   = "../../modules/component-base"

  name_prefix = var.name_prefix
  name        = each.value.name
  runtime     = each.value.runtime
  vpc_id      = local.network.vpc_id

  secret_arns            = each.value.runtime == "lambda" ? local.lambda_secrets : concat(local.fargate_execution_reads, each.key == "one-off" ? values(local.one_off_secrets) : [])
  secrets_kms_key_arns   = local.secret_kms_keys
  task_policies          = local.policies[each.key]
  enable_execute_command = each.value.runtime == "fargate" && var.enable_execute_command
  exec_kms_key_arn       = var.enable_execute_command ? try(local.platform.ecs_cluster.kms_key_arn, null) : null
  kms_key_arn            = local.logs_kms_key_arn
  log_retention_days     = var.log_retention_days

  depends_on = [terraform_data.service_check]
}
