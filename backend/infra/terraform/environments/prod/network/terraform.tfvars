region      = "us-east-1"
environment = "prod"
name_prefix = "node-template-prod"

vpc_cidr = "10.20.0.0/16"

# Un NAT gateway por AZ para las subredes privadas de aplicación (ADR 0016).
egress                   = "per_az_nat"
flow_logs_retention_days = 365
flow_logs_traffic_type   = "ALL"
