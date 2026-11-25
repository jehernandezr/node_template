# tflint configuration for all of backend/infra/terraform. CI passes it with an absolute path
# (--config) because --recursive would look for it in each module.
config {
  call_module_type = "local"
}

plugin "terraform" {
  enabled = true
  preset  = "recommended"
}

# AWS rules: instance types, RDS and ElastiCache classes, runtimes, etc.
# Renovate (tflint-plugin manager) proposes the upgrades.
plugin "aws" {
  enabled = true
  version = "0.50.0"
  source  = "github.com/terraform-linters/tflint-ruleset-aws"
}
