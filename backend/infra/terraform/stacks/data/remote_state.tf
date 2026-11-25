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
  platform_defaults = {
    alarm_topic_arn = null
    ecs_cluster     = null
    observability   = null
    http_api        = null
    api_alb         = null
    realtime_alb    = null
    files_bucket    = null
    ses             = null
  }

  remote_state_config = { bucket = var.state_bucket, region = coalesce(var.state_region, var.region) }

  network = data.terraform_remote_state.network.outputs
  # Terraform does not store null outputs in the state: they are filled in with null.
  platform = merge(local.platform_defaults, data.terraform_remote_state.platform.outputs)
}

data "terraform_remote_state" "network" {
  backend = "s3"
  config  = merge(local.remote_state_config, { key = "${var.region}/network/terraform.tfstate" })
}

data "terraform_remote_state" "platform" {
  backend = "s3"
  config  = merge(local.remote_state_config, { key = "${var.region}/platform/terraform.tfstate" })
}
