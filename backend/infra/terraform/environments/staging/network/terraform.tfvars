region      = "us-east-1"
environment = "staging"
name_prefix = "node-template-staging"

vpc_cidr = "10.30.0.0/16"

# Staging tests promotion to prod with the same network: one NAT per AZ (ADR 0016).
egress                   = "per_az_nat"
flow_logs_retention_days = 30
flow_logs_traffic_type   = "ALL"
