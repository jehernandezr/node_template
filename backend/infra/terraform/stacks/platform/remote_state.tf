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
}

# Sin cómputo (ambiente local) no hay red que leer.
data "terraform_remote_state" "network" {
  count = var.compute_enabled ? 1 : 0

  backend = "s3"
  config  = merge(local.remote_state_config, { key = "${var.region}/network/terraform.tfstate" })
}
