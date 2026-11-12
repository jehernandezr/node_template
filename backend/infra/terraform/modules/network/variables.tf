variable "name_prefix" {
  description = "Prefijo para los nombres de los recursos de red."
  type        = string
}

variable "vpc_cidr" {
  description = "CIDR de la VPC. Debe ser /16: las subredes salen de bloques /22."
  type        = string
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0)) && tonumber(split("/", var.vpc_cidr)[1]) == 16
    error_message = "vpc_cidr debe ser un CIDR /16."
  }
}

variable "tags" {
  description = "Etiquetas adicionales para todos los recursos del módulo."
  type        = map(string)
  default     = {}
}
