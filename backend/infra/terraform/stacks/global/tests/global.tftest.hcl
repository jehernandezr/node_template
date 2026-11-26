# Tests for the global stack with mocked providers: they touch neither AWS nor the backend.
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
  mock_data "aws_iam_policy_document" {
    defaults = { json = "{\"Version\":\"2012-10-17\",\"Statement\":[]}" }
  }
  mock_data "aws_route53_zone" {
    defaults = { zone_id = "ZAPEX0000000000", name_servers = ["ns-1.example.test", "ns-2.example.test"] }
  }
}

variables {
  region            = "us-east-1"
  domain            = "example.test"
  services          = ["identity", "tasks"]
  github_repository = "acme/node-template"
}

run "dev_shares_artifacts_with_the_promotion_accounts" {
  command = plan

  variables {
    environment           = "dev"
    name_prefix           = "nt-dev"
    state_bucket          = "nt-dev-tfstate"
    promotion_account_ids = { staging = "222222222222", prod = "333333333333" }
  }

  assert {
    condition = alltrue([
      for service in ["identity", "tasks"] :
      jsondecode(aws_ecr_repository_policy.promotion[service].policy).Statement[0].Principal.AWS == [
        "arn:aws:iam::333333333333:role/nt-prod-github-deploy",
        "arn:aws:iam::222222222222:role/nt-staging-github-deploy",
      ]
    ])
    error_message = "Every repository lets exactly the staging and prod deploy roles pull."
  }

  assert {
    condition = alltrue([
      for service in ["identity", "tasks"] :
      toset(jsondecode(aws_ecr_repository_policy.promotion[service].policy).Statement[0].Action) == toset([
        "ecr:BatchCheckLayerAvailability", "ecr:BatchGetImage", "ecr:DescribeImages", "ecr:GetDownloadUrlForLayer",
      ])
    ])
    error_message = "The promotion roles may only pull images."
  }

  assert {
    condition     = jsondecode(aws_s3_bucket_policy.artifacts.policy).Statement[1].Sid == "AllowPromotionRead" && jsondecode(aws_s3_bucket_policy.artifacts.policy).Statement[1].Principal.AWS == ["arn:aws:iam::333333333333:role/nt-prod-github-deploy", "arn:aws:iam::222222222222:role/nt-staging-github-deploy"]
    error_message = "The artifacts bucket lets the staging and prod deploy roles read."
  }

  assert {
    condition     = jsondecode(aws_s3_bucket_policy.artifacts.policy).Statement[1].Resource == ["arn:aws:s3:::nt-dev-artifacts/lambda/*"] && toset(jsondecode(aws_s3_bucket_policy.artifacts.policy).Statement[1].Action) == toset(["s3:GetObject", "s3:GetObjectVersion"])
    error_message = "The promotion roles only read the Lambda packages."
  }

  assert {
    condition     = aws_s3_bucket.artifacts.bucket == "nt-dev-artifacts"
    error_message = "The artifacts bucket is <name_prefix>-artifacts."
  }

  assert {
    condition     = aws_route53_zone.environment[0].name == "dev.example.test" && length(data.aws_route53_zone.apex) == 0
    error_message = "dev creates its own zone dev.<domain> and does not read the apex."
  }

  assert {
    condition     = output.hosted_zone.name == "dev.example.test"
    error_message = "The hosted_zone output names the dev zone."
  }
}

run "every_repository_has_immutable_tags_and_the_lifecycle_rules" {
  command = plan

  variables {
    environment  = "dev"
    name_prefix  = "nt-dev"
    state_bucket = "nt-dev-tfstate"
  }

  assert {
    condition     = keys(aws_ecr_repository.service) == ["identity", "tasks"] && alltrue([for r in aws_ecr_repository.service : r.image_tag_mutability == "IMMUTABLE"])
    error_message = "Each service has one repository with immutable tags."
  }

  assert {
    condition     = aws_ecr_repository.service["tasks"].name == "nt-dev/tasks"
    error_message = "Repositories are named <name_prefix>/<service>."
  }

  assert {
    condition = alltrue([
      for policy in aws_ecr_lifecycle_policy.service :
      jsondecode(policy.policy).rules[0].selection == {
        tagStatus = "untagged", countType = "sinceImagePushed", countUnit = "days", countNumber = 7
      }
      && jsondecode(policy.policy).rules[0].action.type == "expire"
    ])
    error_message = "Untagged images expire after 7 days."
  }

  assert {
    condition = alltrue([
      for policy in aws_ecr_lifecycle_policy.service :
      jsondecode(policy.policy).rules[1].selection == {
        tagStatus = "tagged", tagPrefixList = ["sha-"], countType = "imageCountMoreThan", countNumber = 50
      }
      && jsondecode(policy.policy).rules[1].action.type == "expire"
    ])
    error_message = "Only the last 50 sha- images are kept."
  }

  assert {
    condition     = length(aws_ecr_repository_policy.promotion) == 0
    error_message = "Without promotion accounts no repository policy is created."
  }

  assert {
    condition     = length(jsondecode(aws_s3_bucket_policy.artifacts.policy).Statement) == 1 && jsondecode(aws_s3_bucket_policy.artifacts.policy).Statement[0].Sid == "DenyInsecureTransport"
    error_message = "Without promotion accounts the bucket policy only denies insecure transport."
  }

  assert {
    condition     = jsondecode(aws_s3_bucket_policy.artifacts.policy).Statement[0].Effect == "Deny" && jsondecode(aws_s3_bucket_policy.artifacts.policy).Statement[0].Condition.Bool["aws:SecureTransport"] == "false"
    error_message = "The artifacts bucket refuses requests without TLS."
  }
}

run "the_cloudfront_certificate_is_in_us_east_1_and_validated_by_dns" {
  command = plan

  variables {
    region       = "eu-west-1"
    environment  = "staging"
    name_prefix  = "nt-staging"
    state_bucket = "nt-staging-tfstate"
  }

  assert {
    condition     = aws_acm_certificate.cloudfront.region == "us-east-1" && aws_acm_certificate_validation.cloudfront.region == "us-east-1"
    error_message = "The CloudFront certificate and its validation live in us-east-1, whatever the stack region."
  }

  assert {
    condition     = aws_acm_certificate.cloudfront.validation_method == "DNS"
    error_message = "The certificate is validated by DNS."
  }

  assert {
    condition     = aws_acm_certificate.cloudfront.domain_name == "api.staging.example.test" && aws_acm_certificate.cloudfront.subject_alternative_names == toset(["app.staging.example.test"])
    error_message = "The certificate covers api.<zone> and app.<zone>."
  }

  assert {
    condition     = keys(aws_route53_record.certificate_validation) == ["api.staging.example.test", "app.staging.example.test"]
    error_message = "Each certificate name has its validation record."
  }

  assert {
    condition     = aws_route53_zone.environment[0].name == "staging.example.test" && length(data.aws_route53_zone.apex) == 0
    error_message = "staging creates its own zone staging.<domain>."
  }
}

run "prod_reads_the_apex_zone" {
  command = plan

  variables {
    environment  = "prod"
    name_prefix  = "nt-prod"
    state_bucket = "nt-prod-tfstate"
  }

  assert {
    condition     = length(aws_route53_zone.environment) == 0 && data.aws_route53_zone.apex[0].name == "example.test" && data.aws_route53_zone.apex[0].private_zone == false
    error_message = "prod creates no zone and reads the public apex zone."
  }

  assert {
    condition     = alltrue([for record in aws_route53_record.certificate_validation : record.zone_id == "ZAPEX0000000000"])
    error_message = "prod validates its certificate in the apex zone."
  }

  assert {
    condition     = aws_acm_certificate.cloudfront.domain_name == "api.example.test" && aws_acm_certificate.cloudfront.subject_alternative_names == toset(["app.example.test"])
    error_message = "prod drops the environment from its names."
  }

  assert {
    condition     = output.hosted_zone.id == "ZAPEX0000000000" && output.hosted_zone.name == "example.test"
    error_message = "The hosted_zone output is the apex zone in prod."
  }
}

run "only_dev_shares_its_artifacts" {
  command = plan

  variables {
    environment           = "staging"
    name_prefix           = "nt-staging"
    state_bucket          = "nt-staging-tfstate"
    promotion_account_ids = { prod = "333333333333" }
  }

  expect_failures = [var.promotion_account_ids]
}

run "promotion_accounts_are_staging_or_prod_account_ids" {
  command = plan

  variables {
    environment           = "dev"
    name_prefix           = "nt-dev"
    state_bucket          = "nt-dev-tfstate"
    promotion_account_ids = { qa = "12345" }
  }

  expect_failures = [var.promotion_account_ids]
}

run "applies_the_roles_and_the_certificate_validation_records" {
  command = apply

  variables {
    environment  = "dev"
    name_prefix  = "nt-dev"
    state_bucket = "nt-dev-tfstate"
  }

  override_resource {
    target = aws_acm_certificate.cloudfront
    values = {
      arn = "arn:aws:acm:us-east-1:111111111111:certificate/cloudfront"
      domain_validation_options = [
        { domain_name = "api.dev.example.test", resource_record_name = "_api.dev.example.test.", resource_record_type = "CNAME", resource_record_value = "_api.acm-validations.aws." },
        { domain_name = "app.dev.example.test", resource_record_name = "_app.dev.example.test.", resource_record_type = "CNAME", resource_record_value = "_app.acm-validations.aws." },
      ]
    }
  }

  assert {
    condition     = aws_route53_record.certificate_validation["api.dev.example.test"].name == "_api.dev.example.test." && aws_route53_record.certificate_validation["app.dev.example.test"].records == toset(["_app.acm-validations.aws."])
    error_message = "Each name gets the CNAME that ACM asks for."
  }

  assert {
    condition     = alltrue([for record in aws_route53_record.certificate_validation : record.zone_id == aws_route53_zone.environment[0].zone_id && record.type == "CNAME"])
    error_message = "The validation records live in the environment zone."
  }

  assert {
    condition     = output.ecr_repository_prefix == "nt-dev" && output.github_oidc.deploy_role_arn != null && output.github_oidc.publish_role_arn != null
    error_message = "The global stack carries the pipeline roles and the ECR prefix."
  }
}

run "reuses_an_existing_github_provider" {
  command = plan

  variables {
    environment                = "dev"
    name_prefix                = "nt-dev"
    state_bucket               = "nt-dev-tfstate"
    oidc_existing_provider_arn = "arn:aws:iam::111111111111:oidc-provider/token.actions.githubusercontent.com"
  }

  assert {
    condition     = output.github_oidc.provider_arn == var.oidc_existing_provider_arn
    error_message = "With oidc_existing_provider_arn the account's provider is reused."
  }
}
