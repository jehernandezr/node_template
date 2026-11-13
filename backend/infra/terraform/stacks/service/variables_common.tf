# Variables y locales comunes a todos los stacks. Este archivo es idéntico en cada stack;
# backend/infra/scripts/tf-validate.mjs falla si alguno difiere. La lectura del estado de
# otros stacks vive en remote_state.tf.

variable "region" {
  description = "Región de AWS del stack. Cada región tiene sus propios stacks y estados."
  type        = string
}

variable "environment" {
  description = "Ambiente: local (LocalStack), dev, staging o prod."
  type        = string

  validation {
    condition     = contains(["local", "dev", "staging", "prod"], var.environment)
    error_message = "environment debe ser local, dev, staging o prod."
  }
}

variable "name_prefix" {
  description = "Prefijo de los nombres de todos los recursos, por ejemplo node-template-dev."
  type        = string

  validation {
    condition     = can(regex("^[a-z][a-z0-9-]{1,20}[a-z0-9]$", var.name_prefix))
    error_message = "name_prefix debe usar minúsculas, números y guiones, y tener entre 3 y 22 caracteres."
  }
}

variable "aws_endpoint_url" {
  description = "Endpoint único de AWS para el ambiente local (LocalStack), por ejemplo http://localhost:4566. Null en AWS."
  type        = string
  default     = null
}

variable "extra_tags" {
  description = "Etiquetas adicionales para todos los recursos del stack."
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
