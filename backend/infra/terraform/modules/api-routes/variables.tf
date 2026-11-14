variable "name" {
  description = "Nombre del servicio dueño de las rutas."
  type        = string
}

variable "api_id" {
  description = "ID de la API HTTP compartida (stack platform)."
  type        = string
}

variable "api_execution_arn" {
  description = "ARN de ejecución de la API, para el permiso de invocación de la Lambda."
  type        = string
}

variable "authorizer_id" {
  description = "Autorizador de origen (X-Origin-Verify). Null deja las rutas sin autorizador."
  type        = string
  default     = null
}

variable "route_prefixes" {
  description = "Prefijos de ruta del servicio, por ejemplo [\"/tasks\"]. Cada uno crea ANY <prefijo> y ANY <prefijo>/{proxy+}."
  type        = list(string)

  validation {
    condition     = length(var.route_prefixes) > 0 && alltrue([for p in var.route_prefixes : can(regex("^/[a-z0-9][a-z0-9/_-]*[a-z0-9]$", p))])
    error_message = "Cada prefijo empieza por / y usa minúsculas, números, guiones y barras, sin barra final."
  }
}

variable "target" {
  description = "Destino de las rutas: type lambda (lambda_function_name, lambda_invoke_arn) o vpc_link (vpc_link_id, listener_arn del ALB interno)."
  type = object({
    type                 = string
    lambda_function_name = optional(string)
    lambda_invoke_arn    = optional(string)
    vpc_link_id          = optional(string)
    listener_arn         = optional(string)
  })

  validation {
    condition     = contains(["lambda", "vpc_link"], var.target.type)
    error_message = "target.type debe ser lambda o vpc_link."
  }
}

variable "timeout_milliseconds" {
  description = "Tiempo máximo de la integración. API Gateway HTTP admite hasta 30000."
  type        = number
  default     = 29000

  validation {
    condition     = var.timeout_milliseconds >= 50 && var.timeout_milliseconds <= 30000
    error_message = "timeout_milliseconds debe estar entre 50 y 30000."
  }
}
