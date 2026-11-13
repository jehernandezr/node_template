variable "vpc_cidr" {
  description = "CIDR /16 de la VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "egress" {
  description = "Salida a Internet de las subredes privadas de aplicación: none, single_nat (dev) o per_az_nat (prod). Ver ADR 0016."
  type        = string
  default     = "per_az_nat"

  validation {
    condition     = contains(["none", "single_nat", "per_az_nat"], var.egress)
    error_message = "egress debe ser none, single_nat o per_az_nat."
  }
}

variable "flow_logs_retention_days" {
  description = "Días de retención de los flow logs de la VPC."
  type        = number
  default     = 90
}

variable "flow_logs_traffic_type" {
  description = "Tráfico que registran los flow logs: ALL, ACCEPT o REJECT."
  type        = string
  default     = "ALL"
}
