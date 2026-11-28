# Variables and locals shared by all stacks. This file is identical in every stack;
# backend/infra/scripts/tf-validate.mjs fails if any copy differs. environments/<environment>/common.tfvars
# sets environment, name_prefix, domain, main_region, regions and web_origins once for every stack. Reading the
# state of other stacks lives in remote_state.tf.

variable "region" {
  description = "AWS region of the stack. Each region has its own stacks and states."
  type        = string
}

variable "environment" {
  description = "Environment: local (LocalStack), dev, staging or prod."
  type        = string

  validation {
    condition     = contains(["local", "dev", "staging", "prod"], var.environment)
    error_message = "environment must be local, dev, staging or prod."
  }
}

variable "name_prefix" {
  description = "Name prefix for all resources, for example node-template-dev."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,20}[a-z0-9]$", var.name_prefix))
    error_message = "name_prefix must use lowercase letters, digits and hyphens, and be 3 to 22 characters long."
  }
}

variable "domain" {
  description = "Apex domain of the product, for example example.com. Its public hosted zone lives in the prod account; dev and staging delegate <environment>.<domain> from it."
  type        = string

  validation {
    condition     = can(regex("^([a-z0-9]([a-z0-9-]*[a-z0-9])?\\.)+[a-z]{2,}$", var.domain))
    error_message = "domain must be a lowercase DNS name such as example.com."
  }
}

variable "main_region" {
  description = "Code of the main region of the environment, a key of regions. Defaults to us (ADR 0042)."
  type        = string
  default     = "us"
}

variable "regions" {
  description = "Regions of the environment by code: the AWS region, the public API URL and the token issuer of each. The service-base stack hands them to every service as REGIONS and gives each service the code of its own region as SERVICE_REGION."
  type = map(object({
    aws_region   = string
    api_base_url = string
    issuer       = string
  }))

  validation {
    condition     = alltrue([for code in keys(var.regions) : can(regex("^[a-z][a-z0-9-]{0,31}$", code))])
    error_message = "Region codes use lowercase letters, digits and hyphens, start with a letter and are 1 to 32 characters long."
  }

  validation {
    condition     = alltrue(flatten([for r in values(var.regions) : [for url in [r.api_base_url, r.issuer] : can(regex("^https?://[^/\\s]+$", url))]]))
    error_message = "api_base_url and issuer are origins such as https://api.example.com, without a path."
  }

  validation {
    condition     = var.environment == "local" || alltrue(flatten([for r in values(var.regions) : [for url in [r.api_base_url, r.issuer] : startswith(url, "https://")]]))
    error_message = "Outside the local environment, api_base_url and issuer use https."
  }

  validation {
    condition     = length(distinct([for r in values(var.regions) : r.aws_region])) == length(var.regions)
    error_message = "Each region code has its own AWS region."
  }

  validation {
    condition     = contains(keys(var.regions), var.main_region)
    error_message = "main_region must be a key of regions."
  }
}

variable "web_origins" {
  description = "Origins of the web app, such as https://app.dev.example.com: the service-base stack hands them to every service as WEB_ORIGINS, the origins its CORS and Origin policy accept. Outside the local environment there is at least one."
  type        = list(string)
  default     = []

  validation {
    condition     = alltrue([for origin in var.web_origins : can(regex("^https?://[^/\\s]+$", origin))])
    error_message = "web_origins are origins such as https://app.example.com, without a path or a trailing slash."
  }

  validation {
    condition     = var.environment == "local" || (length(var.web_origins) > 0 && alltrue([for origin in var.web_origins : startswith(origin, "https://")]))
    error_message = "Outside the local environment, web_origins lists at least one origin, each with https."
  }
}

variable "aws_endpoint_url" {
  description = "Single AWS endpoint for the local environment (LocalStack), for example http://localhost:4566. Null on AWS."
  type        = string
  default     = null
}

variable "extra_tags" {
  description = "Additional tags for all resources of the stack."
  type        = map(string)
  default     = {}
}

locals {
  localstack = var.aws_endpoint_url != null

  common_tags = merge(var.extra_tags, {
    Project     = "node-template"
    Environment = var.environment
    NamePrefix  = var.name_prefix
    ManagedBy   = "terraform"
  })
}
