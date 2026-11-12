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

variable "egress" {
  description = "Salida a Internet de las subredes privadas de aplicación. none: sin NAT. single_nat: un NAT gateway (dev). per_az_nat: un NAT por AZ (prod). Las subredes de datos nunca tienen salida."
  type        = string
  default     = "per_az_nat"

  validation {
    condition     = contains(["none", "single_nat", "per_az_nat"], var.egress)
    error_message = "egress debe ser none, single_nat o per_az_nat."
  }
}

variable "flow_logs_retention_days" {
  description = "Días de retención de los flow logs en CloudWatch Logs."
  type        = number
  default     = 90

  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827, 2192, 2557, 2922, 3288, 3653], var.flow_logs_retention_days)
    error_message = "flow_logs_retention_days debe ser un valor de retención admitido por CloudWatch Logs."
  }
}

variable "flow_logs_traffic_type" {
  description = "Tráfico que registran los flow logs: ALL, ACCEPT o REJECT. REJECT reduce el costo en desarrollo."
  type        = string
  default     = "ALL"

  validation {
    condition     = contains(["ALL", "ACCEPT", "REJECT"], var.flow_logs_traffic_type)
    error_message = "flow_logs_traffic_type debe ser ALL, ACCEPT o REJECT."
  }
}

variable "tags" {
  description = "Etiquetas adicionales para todos los recursos del módulo."
  type        = map(string)
  default     = {}
}
