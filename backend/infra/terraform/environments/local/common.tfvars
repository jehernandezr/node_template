# Values shared by every stack of the environment. deploy-aws.sh passes this file before each stack's
# terraform.tfvars, and a stack's terraform.tfvars never repeats a key set here.
environment = "local"
name_prefix = "node-template-local"

# Not used by the LocalStack stacks; every stack declares it.
domain = "node-template.localhost"
