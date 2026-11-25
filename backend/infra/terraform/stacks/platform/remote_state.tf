variable "state_bucket" {
  description = "S3 bucket with the environment states. Keys are <region>/<stack>/terraform.tfstate."
  type        = string
}

variable "state_region" {
  description = "Region of the state bucket. Null uses the stack region."
  type        = string
  default     = null
}

locals {
  # Against LocalStack the S3 backend needs the same endpoint and must skip the AWS validations.
  remote_state_config = merge(
    { bucket = var.state_bucket, region = coalesce(var.state_region, var.region) },
    local.localstack ? {
      endpoints                   = { s3 = var.aws_endpoint_url }
      use_path_style              = true
      skip_credentials_validation = true
      skip_region_validation      = true
      skip_requesting_account_id  = true
      skip_metadata_api_check     = true
    } : null,
  )
}

# Without compute (local environment) there is no network to read.
data "terraform_remote_state" "network" {
  count = var.compute_enabled ? 1 : 0

  backend = "s3"
  config  = merge(local.remote_state_config, { key = "${var.region}/network/terraform.tfstate" })
}
