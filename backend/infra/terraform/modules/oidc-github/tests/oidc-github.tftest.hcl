# Tests for the oidc-github module with mocked providers: they touch neither AWS nor a backend. The policies
# are built with jsonencode, so the assertions read the real documents.
# Run: terraform init -backend=false && terraform test

mock_provider "aws" {
  mock_data "aws_region" {
    defaults = { region = "us-east-1", name = "us-east-1" }
  }
  mock_data "aws_partition" {
    defaults = { partition = "aws" }
  }
  mock_data "aws_caller_identity" {
    defaults = { account_id = "111111111111" }
  }
}

variables {
  name_prefix           = "nt-dev"
  github_repository     = "acme/node-template"
  github_environment    = "dev"
  state_bucket          = "nt-dev-tfstate"
  artifacts_bucket_arn  = "arn:aws:s3:::nt-dev-artifacts"
  artifacts_kms_key_arn = "arn:aws:kms:us-east-1:111111111111:key/artifacts"
  ecr_repository_arns = [
    "arn:aws:ecr:us-east-1:111111111111:repository/nt-dev/identity",
    "arn:aws:ecr:us-east-1:111111111111:repository/nt-dev/tasks",
  ]
}

run "the_publish_role_pushes_only_to_the_given_repositories" {
  command = plan

  assert {
    condition     = tolist(one([for statement in jsondecode(aws_iam_role_policy.publish.policy).Statement : statement.Resource if statement.Sid == "EcrPush"])) == tolist(var.ecr_repository_arns)
    error_message = "The publish role pushes to exactly the repositories of the global stack."
  }

  assert {
    condition = alltrue([
      for statement in jsondecode(aws_iam_role_policy.publish.policy).Statement :
      !contains(flatten([statement.Action]), "ecr:CreateRepository")
    ])
    error_message = "The publish role cannot create repositories: the global stack owns them."
  }

  assert {
    condition = alltrue([
      for statement in jsondecode(aws_iam_role_policy.publish.policy).Statement :
      statement.Sid == "EcrLogin" || !contains(flatten([statement.Resource]), "*")
    ])
    error_message = "Only the ECR login is granted on every resource."
  }
}

run "the_deploy_role_uses_a_key_only_for_its_state_bucket" {
  command = plan

  assert {
    condition = one([for statement in jsondecode(aws_iam_role_policy.deploy.policy).Statement : statement.Condition if statement.Sid == "StateKey"]) == {
      StringEquals = { "kms:ViaService" = "s3.us-east-1.amazonaws.com" }
      StringLike   = { "kms:EncryptionContext:aws:s3:arn" = ["arn:aws:s3:::nt-dev-tfstate", "arn:aws:s3:::nt-dev-tfstate/*"] }
    }
    error_message = "The state key is used only through S3 of the region and only for the state bucket."
  }

  assert {
    condition     = toset(one([for statement in jsondecode(aws_iam_role_policy.deploy.policy).Statement : statement.Action if statement.Sid == "StateKey"])) == toset(["kms:Decrypt", "kms:GenerateDataKey"])
    error_message = "The state key grants only decrypt and data keys."
  }
}

run "every_role_trusts_one_repository_and_environment" {
  command = plan

  variables {
    create_provider       = false
    existing_provider_arn = "arn:aws:iam::111111111111:oidc-provider/token.actions.githubusercontent.com"
  }

  assert {
    condition = alltrue([
      for role in [aws_iam_role.deploy, aws_iam_role.publish, aws_iam_role.web] :
      jsondecode(role.assume_role_policy).Statement[0].Principal.Federated == var.existing_provider_arn &&
      jsondecode(role.assume_role_policy).Statement[0].Condition.StringEquals == {
        "token.actions.githubusercontent.com:aud" = "sts.amazonaws.com"
        "token.actions.githubusercontent.com:sub" = "repo:acme/node-template:environment:dev"
      }
    ])
    error_message = "Each role trusts only the GitHub audience and the subject of its repository and environment."
  }
}
