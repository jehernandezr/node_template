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

  # Contra LocalStack el backend S3 necesita el mismo endpoint y omitir las validaciones de AWS.
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

  # Terraform no guarda en el estado las salidas nulas: se completan con null.
  platform = merge(local.platform_defaults, data.terraform_remote_state.platform.outputs)
}

data "terraform_remote_state" "platform" {
  backend = "s3"
  config  = merge(local.remote_state_config, { key = "${var.region}/platform/terraform.tfstate" })
}
