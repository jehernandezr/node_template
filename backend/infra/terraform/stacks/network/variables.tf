variable "vpc_cidr" {
  description = "/16 CIDR of the VPC."
  type        = string
  default     = "10.0.0.0/16"
}

variable "egress" {
  description = "Internet egress of the private application subnets: none, single_nat (dev) or per_az_nat (prod). See ADR 0016."
  type        = string
  default     = "per_az_nat"

  validation {
    condition     = contains(["none", "single_nat", "per_az_nat"], var.egress)
    error_message = "egress must be none, single_nat or per_az_nat."
  }
}

variable "flow_logs_retention_days" {
  description = "Retention in days of the VPC flow logs."
  type        = number
  default     = 90
}

variable "flow_logs_traffic_type" {
  description = "Traffic the flow logs record: ALL, ACCEPT or REJECT."
  type        = string
  default     = "ALL"
}
