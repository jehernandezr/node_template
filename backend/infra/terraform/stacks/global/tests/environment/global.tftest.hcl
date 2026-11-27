# Plans the global stack with the real values of an environment and mocked providers. tf-validate.mjs runs it
# once per environment with -var-file common.tfvars and -var-file the stack's terraform.tfvars.

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
  mock_data "aws_route53_zone" {
    defaults = { zone_id = "ZAPEX0000000000", name_servers = ["ns-1.example.test"] }
  }
}

run "plans_with_the_environment_values" {
  command = plan

  assert {
    condition     = aws_acm_certificate.cloudfront.domain_name == "api.${local.zone_name}" && local.zone_name == (var.environment == "prod" ? var.domain : "${var.environment}.${var.domain}")
    error_message = "The CloudFront certificate covers api.<zone>, and the zone is <environment>.<domain> outside prod."
  }

  assert {
    condition     = alltrue([for repository in aws_ecr_repository.service : startswith(repository.name, "${var.name_prefix}/")])
    error_message = "Every repository lives under the name_prefix of common.tfvars."
  }
}
