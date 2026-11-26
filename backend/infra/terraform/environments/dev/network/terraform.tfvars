region = "us-east-1"

vpc_cidr = "10.10.0.0/16"

# A single NAT gateway to reduce cost (ADR 0016).
egress                   = "single_nat"
flow_logs_retention_days = 14
flow_logs_traffic_type   = "REJECT"
