region = "us-east-1"

vpc_cidr = "10.20.0.0/16"

# One NAT gateway per AZ for the private application subnets (ADR 0016).
egress                   = "per_az_nat"
flow_logs_retention_days = 365
flow_logs_traffic_type   = "ALL"
