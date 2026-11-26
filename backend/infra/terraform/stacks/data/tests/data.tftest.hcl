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
  environment  = "dev"
  name_prefix  = "nt-dev"
  state_bucket = "nt-dev-tfstate"
  db_services = {
    identity = { shards = 2, catalog = "owner" }
    tasks    = { catalog = "read" }
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

run "one_database_per_shard_plus_catalog" {
  command = plan

  assert {
    condition     = toset([for d in local.databases : d.name]) == toset(["catalog", "identity_shard_0", "identity_shard_1", "tasks_shard_0"])
    error_message = "The databases match backend/infra/local/postgres/init.sql."
  }

  assert {
    condition     = alltrue([for d in local.databases : d.extensions == tolist(["vector"])])
    error_message = "Every database has pgvector."
  }

  assert {
    condition     = [for d in local.databases : d.owner if d.name == "identity_shard_1"][0] == "identity"
    error_message = "Each service owns its shards."
  }

  assert {
    condition     = tolist(local.group_roles[0].members) == tolist(["identity"]) && tolist(local.group_roles[1].members) == tolist(["tasks"])
    error_message = "catalog owner and read map to group roles."
  }

  assert {
    condition     = local.service_databases["tasks"].catalog == "catalog" && length(local.service_databases["tasks"].shards) == 1
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

run "rejects_unknown_catalog_access" {
  command = plan

  variables {
    db_services = { identity = { catalog = "write" } }
  }

  expect_failures = [var.db_services]
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
