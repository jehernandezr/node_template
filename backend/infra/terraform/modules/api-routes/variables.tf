variable "name" {
  description = "Name of the service that owns the routes."
  type        = string
}

variable "api_id" {
  description = "ID of the shared HTTP API (platform stack)."
  type        = string
}

variable "api_execution_arn" {
  description = "Execution ARN of the API, for the Lambda invoke permission."
  type        = string
}

variable "authorizer_id" {
  description = "Origin authorizer (X-Origin-Verify). Null leaves the routes without an authorizer."
  type        = string
  default     = null
}

variable "route_prefixes" {
  description = "Route prefixes of the service, for example [\"/tasks\"]. Each one creates ANY <prefix> and ANY <prefix>/{proxy+}."
  type        = list(string)

  validation {
    condition     = length(var.route_prefixes) > 0 && alltrue([for p in var.route_prefixes : can(regex("^/[a-z0-9][a-z0-9/_-]*[a-z0-9]$", p))])
    error_message = "Each prefix starts with / and uses lowercase letters, digits, hyphens and slashes, with no trailing slash."
  }
}

variable "target" {
  description = "Target of the routes: type lambda (lambda_function_name, lambda_invoke_arn) or vpc_link (vpc_link_id, listener_arn of the internal ALB)."
  type = object({
    type                 = string
    lambda_function_name = optional(string)
    lambda_invoke_arn    = optional(string)
    vpc_link_id          = optional(string)
    listener_arn         = optional(string)
  })

  validation {
    condition     = contains(["lambda", "vpc_link"], var.target.type)
    error_message = "target.type must be lambda or vpc_link."
  }
}

variable "timeout_milliseconds" {
  description = "Maximum integration time. API Gateway HTTP allows up to 30000."
  type        = number
  default     = 29000

  validation {
    condition     = var.timeout_milliseconds >= 50 && var.timeout_milliseconds <= 30000
    error_message = "timeout_milliseconds must be between 50 and 30000."
  }
}
