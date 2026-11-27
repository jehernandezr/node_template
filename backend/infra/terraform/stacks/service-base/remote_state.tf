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

    compute_logs_kms_key_arn = null
  }

  remote_state_config = { bucket = var.state_bucket, region = coalesce(var.state_region, var.region) }

  network = data.terraform_remote_state.network.outputs
  # Terraform does not store null outputs in the state: they are filled in with null.
  platform  = merge(local.platform_defaults, data.terraform_remote_state.platform.outputs)
  data      = data.terraform_remote_state.data.outputs
  messaging = data.terraform_remote_state.messaging.outputs
  service   = data.terraform_remote_state.service.outputs
}

data "terraform_remote_state" "network" {
  backend = "s3"
  config  = merge(local.remote_state_config, { key = "${var.region}/network/terraform.tfstate" })
}

data "terraform_remote_state" "platform" {
  backend = "s3"
  config  = merge(local.remote_state_config, { key = "${var.region}/platform/terraform.tfstate" })
}

data "terraform_remote_state" "data" {
  backend = "s3"
  config  = merge(local.remote_state_config, { key = "${var.region}/data/terraform.tfstate" })
}

data "terraform_remote_state" "messaging" {
  backend = "s3"
  config  = merge(local.remote_state_config, { key = "${var.region}/messaging/terraform.tfstate" })
}

# The service stack of this same service, applied after this one. Before its first apply it has no state, and
# the defaults say it runs nothing.
data "terraform_remote_state" "service" {
  backend  = "s3"
  config   = merge(local.remote_state_config, { key = "${var.region}/services/${var.service_name}/terraform.tfstate" })
  defaults = { components = [] }
}
