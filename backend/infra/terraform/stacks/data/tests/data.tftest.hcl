# Tests for the data stack with mocked providers: they touch neither AWS nor the backend.
# Run: terraform init -backend=false && terraform test

mock_provider "aws" {
  mock_data "aws_region" {
    defaults = { region = "us-east-1", name = "us-east-1" }
  }
  mock_data "aws_partition" {
    defaults = { partition = "aws" }
  }
  mock_data "aws_caller_identity" {
    defaults = { account_id = "123456789012" }
  }
  mock_resource "aws_db_instance" {
    defaults = {
      master_user_secret = [{ secret_arn = "arn:aws:secretsmanager:us-east-1:123456789012:secret:rds-master-AbCdEf", kms_key_id = "k", secret_status = "active" }]
    }
  }
  mock_data "aws_serverlessapplicationrepository_application" {
    defaults = { application_id = "arn:aws:serverlessrepo:us-east-1:297356786788:applications/SecretsManagerRDSPostgreSQLRotationSingleUser", semantic_version = "1.1.0", required_capabilities = [] }
  }
}

# archive and random are local: they package the bootstrap and generate ephemeral passwords.

variables {
  region       = "us-east-1"
  domain       = "example.test"
  regions      = { us = { aws_region = "us-east-1", api_base_url = "https://api.example.test", issuer = "https://api.example.test" } }
  environment  = "dev"
  name_prefix  = "nt-dev"
  state_bucket = "nt-dev-tfstate"
  db_services = {
    identity = { shards = 2 }
    tasks    = { shards = 2 }
  }
  valkey_services       = ["identity", "tasks"]
  db_read_replica_count = 1
}

override_data {
  target = data.terraform_remote_state.network
  values = {
    outputs = {
      vpc_id                     = "vpc-0123456789abcdef0"
      data_subnet_ids            = ["subnet-0123456789abcdef0", "subnet-0123456789abcdef1"]
      endpoint_security_group_id = "sg-0endpoints"
    }
  }
}

override_data {
  target = data.terraform_remote_state.platform
  values = {
    outputs = {
      alarm_topic_arn = "arn:aws:sns:us-east-1:123456789012:nt-dev-alarms"
      observability   = null
    }
  }
}

run "one_catalog_per_service_and_one_database_per_shard" {
  command = plan

  assert {
    condition     = toset([for d in local.databases : d.name]) == toset(["identity_catalog", "identity_shard_0", "identity_shard_1", "tasks_catalog", "tasks_shard_0", "tasks_shard_1"])
    error_message = "Each service has its own catalog and its shards, as in backend/infra/local/postgres/init.sql."
  }

  assert {
    condition     = alltrue([for d in local.databases : d.extensions == tolist(["vector"])])
    error_message = "Every database has pgvector."
  }

  assert {
    condition     = alltrue([for d in local.databases : startswith(d.name, trimsuffix(d.owner, "owner")) && d.writers == ["${trimsuffix(d.owner, "_owner")}_app"] && d.readers == ["${trimsuffix(d.owner, "_owner")}_reader"]])
    error_message = "Each service owner role owns its catalog and its shards; only its app role writes them and its reader role reads them."
  }

  assert {
    condition     = local.db_roles["identity"] == { owner = "identity_owner", app = "identity_app", reader = "identity_reader" }
    error_message = "Each service has an owner, an app and a reader role (ADR 0041)."
  }

  assert {
    condition     = toset(keys(module.rds.service_secret_arns)) == toset(["identity_owner", "identity_app", "tasks_owner", "tasks_app", "replication"])
    error_message = "The owner and app roles have rotated password secrets; the reader roles log in with IAM only and have none."
  }


  assert {
    condition     = alltrue([for auth in module.rds.proxy_auth : auth.iam_auth == "REQUIRED" && auth.auth_scheme == "SECRETS"]) && length(module.rds.proxy_auth) == 5
    error_message = "Clients reach RDS Proxy with IAM only; the proxy logs in with each password user's secret."
  }

  assert {
    condition     = module.rds.iam_database_authentication_enabled
    error_message = "The instance and its replicas accept IAM database authentication, which the readers use."
  }

  assert {
    condition     = local.service_databases["tasks"].catalog == "tasks_catalog" && length(local.service_databases["tasks"].shards) == 2
    error_message = "Each service receives the map of its databases."
  }

  assert {
    condition     = local.valkey_users["tasks"] == "on ~tasks:* &tasks:* %R~auth:* &auth:revocations +@all -@dangerous"
    error_message = "A service that does not own the authentication state sees its own keys and only reads auth:*."
  }

  assert {
    condition     = local.valkey_users["identity"] == "on ~identity:* &identity:* ~auth:* &auth:* +@all -@dangerous"
    error_message = "The service that owns the authentication state writes auth:*."
  }

  assert {
    condition     = output.valkey.cache_name == "nt-dev-valkey" && output.valkey.user_names["tasks"] == "nt-dev-tasks"
    error_message = "Services receive the cache and the user they sign the IAM token with."
  }

  assert {
    condition     = length(aws_vpc_security_group_egress_rule.clients_to_replicas) == 1
    error_message = "With replicas, clients have egress to them."
  }
}

run "auth_writer_is_configurable" {
  command = plan

  variables {
    valkey_auth_writer = "tasks"
  }

  assert {
    condition     = local.valkey_users["tasks"] == "on ~tasks:* &tasks:* ~auth:* &auth:* +@all -@dangerous" && local.valkey_users["identity"] == "on ~identity:* &identity:* %R~auth:* &auth:revocations +@all -@dangerous"
    error_message = "The owner of auth:* comes from valkey_auth_writer."
  }
}

run "acl_overrides_replace_the_generated_rules" {
  command = plan

  variables {
    valkey_acl_overrides = { tasks = "on ~* +@all" }
  }

  assert {
    condition     = local.valkey_users["tasks"] == "on ~* +@all"
    error_message = "A custom ACL replaces the generated one."
  }
}

# Without TENANT_MOVE_TARGETS, group shard_<n> maps to <service>_shard_<n> in every service (ADR 0032), so a
# service with fewer shards than identity fails the onboarding of every tenant identity places beyond them.
run "every_service_has_the_same_number_of_shards" {
  command = plan

  variables {
    db_services = {
      identity = { shards = 2 }
      tasks    = { shards = 1 }
    }
  }

  expect_failures = [var.db_services]
}

# Tokens and API calls of a deployed environment travel over TLS; only local runs on plain http.
run "the_backup_retention_reaches_the_instance" {
  command = plan

  variables {
    environment                = "staging"
    db_backup_retention_period = 14
  }

  assert {
    condition     = module.rds.backup_retention_period == 14
    error_message = "The instance keeps the automated backups db_backup_retention_period asks for."
  }
}

run "staging_rejects_a_backup_retention_below_14_days" {
  command = plan

  variables {
    environment                = "staging"
    db_backup_retention_period = 7
  }

  expect_failures = [var.db_backup_retention_period]
}

run "prod_rejects_a_backup_retention_below_35_days" {
  command = plan

  variables {
    environment                = "prod"
    db_backup_retention_period = 14
  }

  expect_failures = [var.db_backup_retention_period]
}

run "a_deployed_environment_rejects_an_http_issuer" {
  command = plan

  variables {
    environment                = "prod"
    db_backup_retention_period = 35
    regions                    = { us = { aws_region = "us-east-1", api_base_url = "https://api.example.test", issuer = "http://api.example.test" } }
  }

  expect_failures = [var.regions]
}

run "the_local_environment_accepts_http_regions" {
  command = plan

  variables {
    environment = "local"
    regions     = { us = { aws_region = "us-east-1", api_base_url = "http://localhost:3000", issuer = "http://localhost:3000" } }
  }

  assert {
    condition     = var.regions["us"].issuer == "http://localhost:3000"
    error_message = "The local environment runs on plain http."
  }
}

# The proxy and replica resource ids are known at plan time through the overrides.
run "services_reach_the_database_with_iam" {
  command = plan

  override_resource {
    target          = module.rds.aws_db_proxy.this
    override_during = plan
    values          = { arn = "arn:aws:rds:us-east-1:123456789012:db-proxy:prx-0123456789abcdef0", name = "nt-dev-proxy" }
  }

  override_resource {
    target          = module.rds.aws_db_instance.replica
    override_during = plan
    values          = { resource_id = "db-REPLICA1" }
  }

  assert {
    condition     = local.db_connect_arns["identity"].app == ["arn:aws:rds-db:us-east-1:123456789012:dbuser:prx-0123456789abcdef0/identity_app"] && local.db_connect_arns["identity"].owner == ["arn:aws:rds-db:us-east-1:123456789012:dbuser:prx-0123456789abcdef0/identity_owner"]
    error_message = "The app and owner roles connect through RDS Proxy with IAM."
  }

  assert {
    condition     = local.db_connect_arns["identity"].reader == ["arn:aws:rds-db:us-east-1:123456789012:dbuser:db-REPLICA1/identity_reader"]
    error_message = "The reader role connects to each replica with IAM."
  }

  assert {
    condition     = module.rds.pinned_connections_alarm.metric_name == "DatabaseConnectionsCurrentlySessionPinned" && module.rds.pinned_connections_alarm.dimensions["ProxyName"] == "nt-dev-proxy" && module.rds.pinned_connections_alarm.threshold == 100
    error_message = "An alarm watches the proxy connections pinned to a session (ADR 0041)."
  }
}
