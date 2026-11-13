# Red de la región: VPC, subredes públicas, privadas y de datos, NAT según egress,
# endpoints de VPC y flow logs (ADR 0016).

module "network" {
  source = "../../modules/network"

  name_prefix              = var.name_prefix
  vpc_cidr                 = var.vpc_cidr
  egress                   = var.egress
  flow_logs_retention_days = var.flow_logs_retention_days
  flow_logs_traffic_type   = var.flow_logs_traffic_type
}
