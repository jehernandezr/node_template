# Pruebas del stack de datos con proveedores simulados: no tocan AWS ni el backend.
# Ejecuta: terraform init -backend=false && terraform test

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

# archive y random son locales: empaquetan el bootstrap y generan contraseñas efímeras.

variables {
  region       = "us-east-1"
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
    error_message = "Las bases coinciden con backend/infra/local/postgres/init.sql."
  }

  assert {
    condition     = alltrue([for d in local.databases : d.extensions == tolist(["vector"])])
    error_message = "Cada base tiene pgvector."
  }

  assert {
    condition     = [for d in local.databases : d.owner if d.name == "identity_shard_1"][0] == "identity"
    error_message = "Cada servicio es dueño de sus shards."
  }

  assert {
    condition     = tolist(local.group_roles[0].members) == tolist(["identity"]) && tolist(local.group_roles[1].members) == tolist(["tasks"])
    error_message = "catalog owner y read se traducen en roles de grupo."
  }

  assert {
    condition     = local.service_databases["tasks"].catalog == "catalog" && length(local.service_databases["tasks"].shards) == 1
    error_message = "Cada servicio recibe el mapa de sus bases."
  }

  assert {
    condition     = local.valkey_users["tasks"] == "on ~tasks:* &tasks:* +@all -@dangerous"
    error_message = "Cada usuario Valkey solo ve sus llaves y canales."
  }

  assert {
    condition     = length(aws_vpc_security_group_egress_rule.clients_to_replicas) == 1
    error_message = "Con réplicas, los clientes salen hacia ellas."
  }
}

run "rejects_unknown_catalog_access" {
  command = plan

  variables {
    db_services = { identity = { catalog = "write" } }
  }

  expect_failures = [var.db_services]
}
