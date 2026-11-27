# What a service needs before it runs (ADR 0043): the roles, log groups and security groups of each of its
# components and of its one-off task, and the environment they share. The service stack reads all of it through
# remote state and runs the components; the pipeline runs migrate (and, for identity, signing-keys and seed)
# from one_off_task before applying the service stack.

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
  db_secret_arn = var.database_access ? try(local.data.db_service_secret_arns[local.svc], null) : null
  valkey_user   = var.valkey_access ? try(local.data.valkey.user_names[local.svc], null) : null
  observability = local.platform.observability

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
    },
    var.database_access ? {
      DB_PROXY_HOST   = local.data.db.proxy_endpoint
      DB_READER_HOSTS = join(",", local.data.db.reader_endpoints)
      DB_PORT         = tostring(local.data.db.port)
      DB_DATABASES    = jsonencode(local.databases)
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
  lambda_environment  = merge(local.common_environment, local.db_secret_arn == null ? {} : { DB_SECRET_ARN = local.db_secret_arn })

  # --- Components ------------------------------------------------------------------
  # Each component gets only what it uses: the API and realtime do not consume queues, each
  # worker consumes only its own, and files and SES are requested per component. The one-off task
  # (migrate, signing-keys, seed) reaches the database and Valkey and publishes nothing. Consumer
  # Lambdas get their queue permission in the service stack, with their event source mapping.
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
  )

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
    local.db_secret_arn == null ? [] : [local.data.db.kms_key_arn],
    local.observability == null ? [] : [local.observability.kms_key_arn],
  ))

  # Fargate gets the secret through valueFrom; Lambda gets the ARN and reads it at startup. The Fargate
  # execution roles also read the OpenObserve authorization for the collector sidecar.
  fargate_secrets          = merge(var.secrets, local.db_secret_arn == null ? {} : { DB_CREDENTIALS = local.db_secret_arn })
  fargate_execution_reads  = concat(values(local.fargate_secrets), local.observability == null ? [] : [local.observability.otlp_authorization_value_from])
  lambda_secrets           = distinct(concat([for v in values(var.secrets) : regex("^arn:[^:]+:secretsmanager:[^:]+:[0-9]{12}:secret:[^:]+", v)], local.db_secret_arn == null ? [] : [local.db_secret_arn]))
  data_security_group_ids  = [local.data.clients_security_group_id]
  component_names_distinct = length(distinct([for c in values(local.components) : c.name])) == length(local.components)

  # One logs CMK per environment for all compute (platform stack).
  logs_kms_key_arn = local.platform.compute_logs_kms_key_arn
}

# References to other stacks that variable validation cannot check.
resource "terraform_data" "service_check" {
  input = local.svc

  lifecycle {
    precondition {
      condition     = local.component_names_distinct
      error_message = "Two components share a name: a worker or consumer key cannot repeat another one, nor be api, rt or one-off."
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
      condition     = !var.database_access || (local.databases != null && local.db_secret_arn != null)
      error_message = "database_access needs the service in db_services of the data stack."
    }
    precondition {
      condition     = !var.valkey_access || local.valkey_user != null
      error_message = "valkey_access needs the service in valkey_services of the data stack."
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

  secret_arns            = each.value.runtime == "fargate" ? local.fargate_execution_reads : local.lambda_secrets
  secrets_kms_key_arns   = local.secret_kms_keys
  task_policies          = local.policies[each.key]
  enable_execute_command = each.value.runtime == "fargate" && var.enable_execute_command
  exec_kms_key_arn       = var.enable_execute_command ? try(local.platform.ecs_cluster.kms_key_arn, null) : null
  kms_key_arn            = local.logs_kms_key_arn
  log_retention_days     = var.log_retention_days

  depends_on = [terraform_data.service_check]
}
