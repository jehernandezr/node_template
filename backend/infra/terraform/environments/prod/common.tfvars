# Values shared by every stack of the environment. deploy-aws.sh passes this file before each stack's
# terraform.tfvars, and a stack's terraform.tfvars never repeats a key set here.
environment = "prod"
name_prefix = "node-template-prod"

# Apex domain of the product. Its public hosted zone lives in this account and the global stack reads it.
domain = "example.com"
