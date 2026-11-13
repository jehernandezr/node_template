variable "state_bucket" {
  description = "Bucket S3 con los estados del ambiente. Las claves son <región>/<stack>/terraform.tfstate."
  type        = string
}

variable "state_region" {
  description = "Región del bucket de estados. Null usa la región del stack."
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

  # Terraform no guarda en el estado las salidas nulas: se completan con null.
  platform = merge(local.platform_defaults, data.terraform_remote_state.platform.outputs)
}

data "terraform_remote_state" "platform" {
  backend = "s3"
  config  = merge(local.remote_state_config, { key = "${var.region}/platform/terraform.tfstate" })
}
