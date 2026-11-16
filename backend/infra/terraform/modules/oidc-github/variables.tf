variable "name_prefix" {
  description = "Prefijo de los nombres de roles, bucket y repositorios, por ejemplo node-template-dev."
  type        = string
}

variable "github_repository" {
  description = "Repositorio de GitHub que puede asumir los roles, con la forma dueño/nombre."
  type        = string

  validation {
    condition     = can(regex("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$", var.github_repository))
    error_message = "github_repository debe tener la forma dueño/nombre, sin comodines."
  }
}

variable "github_environment" {
  description = "Environment de GitHub cuyos jobs pueden asumir los roles. Es la única identidad que acepta la política de confianza."
  type        = string

  validation {
    condition     = can(regex("^[A-Za-z0-9_.-]+$", var.github_environment))
    error_message = "github_environment no admite comodines ni espacios."
  }
}

variable "create_provider" {
  description = "Crea el proveedor OIDC de GitHub. Solo puede haber uno por cuenta: en la segunda región o ambiente de la misma cuenta, pon false y pasa existing_provider_arn."
  type        = bool
  default     = true
}

variable "existing_provider_arn" {
  description = "ARN del proveedor OIDC de GitHub que ya existe en la cuenta. Obligatorio con create_provider = false."
  type        = string
  default     = null

  validation {
    condition     = var.create_provider || var.existing_provider_arn != null
    error_message = "Con create_provider = false hay que indicar existing_provider_arn."
  }
}

variable "state_bucket" {
  description = "Bucket de los estados de Terraform del ambiente. El rol de despliegue lo lee y lo escribe."
  type        = string
}

variable "deploy_policy_arns" {
  description = "Políticas administradas que se suman al rol de despliegue: lo que Terraform necesita crear en la cuenta. La plantilla no elige un alcance por ti."
  type        = list(string)
  default     = []
}

variable "artifacts_force_destroy" {
  description = "Permite borrar el bucket de artefactos con contenido. Solo para ambientes desechables."
  type        = bool
  default     = false
}

variable "tags" {
  description = "Etiquetas de los recursos del módulo."
  type        = map(string)
  default     = {}
}
