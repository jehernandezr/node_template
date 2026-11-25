variable "name_prefix" {
  description = "Prefix for the network resource names."
  type        = string
}

variable "vpc_cidr" {
  description = "VPC CIDR. Must be a /16: the subnets are carved as /22 blocks."
  type        = string
  default     = "10.0.0.0/16"

  validation {
    condition     = can(cidrhost(var.vpc_cidr, 0)) && tonumber(split("/", var.vpc_cidr)[1]) == 16
    error_message = "vpc_cidr must be a /16 CIDR."
  }
}

variable "egress" {
  description = "Internet egress for the private application subnets. none: no NAT. single_nat: one NAT gateway (dev). per_az_nat: one NAT per AZ (prod). The data subnets never have egress."
  type        = string
  default     = "per_az_nat"

  validation {
    condition     = contains(["none", "single_nat", "per_az_nat"], var.egress)
    error_message = "egress must be none, single_nat or per_az_nat."
  }
}

variable "flow_logs_retention_days" {
  description = "Retention days for the flow logs in CloudWatch Logs."
  type        = number
  default     = 90

  validation {
    condition     = contains([1, 3, 5, 7, 14, 30, 60, 90, 120, 150, 180, 365, 400, 545, 731, 1096, 1827, 2192, 2557, 2922, 3288, 3653], var.flow_logs_retention_days)
    error_message = "flow_logs_retention_days must be a retention value supported by CloudWatch Logs."
  }
}

variable "flow_logs_traffic_type" {
  description = "Traffic recorded by the flow logs: ALL, ACCEPT or REJECT. REJECT lowers the cost in development."
  type        = string
  default     = "ALL"

  validation {
    condition     = contains(["ALL", "ACCEPT", "REJECT"], var.flow_logs_traffic_type)
    error_message = "flow_logs_traffic_type must be ALL, ACCEPT or REJECT."
  }
}

variable "tags" {
  description = "Additional tags for all module resources."
  type        = map(string)
  default     = {}
}
