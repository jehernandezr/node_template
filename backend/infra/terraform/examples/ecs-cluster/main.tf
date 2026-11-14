terraform {
  required_version = ">= 1.10"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = ">= 6.0, < 7.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}

module "ecs_cluster" {
  source = "../../modules/ecs-cluster"

  name_prefix        = "nt-dev"
  container_insights = "enhanced"

  default_capacity_provider_strategy = [
    { capacity_provider = "FARGATE", weight = 1, base = 1 },
    { capacity_provider = "FARGATE_SPOT", weight = 3 },
  ]

  tags = { Environment = "dev" }
}

output "cluster_arn" {
  value = module.ecs_cluster.cluster_arn
}
