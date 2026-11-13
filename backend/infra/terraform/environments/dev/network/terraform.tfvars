region      = "us-east-1"
environment = "dev"
name_prefix = "node-template-dev"

vpc_cidr = "10.10.0.0/16"

# Un solo NAT gateway para abaratar (ADR 0016).
egress                   = "single_nat"
flow_logs_retention_days = 14
flow_logs_traffic_type   = "REJECT"
