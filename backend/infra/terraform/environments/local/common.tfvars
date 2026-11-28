# Values shared by every stack of the environment. deploy-aws.sh passes this file before each stack's
# terraform.tfvars, and a stack's terraform.tfvars never repeats a key set here.
environment = "local"
name_prefix = "node-template-local"

# Not used by the LocalStack stacks; every stack declares it.
domain = "node-template.localhost"

# The LocalStack region. The local services run outside Terraform with the regions of backend/.env.example.
main_region = "local"
regions = {
  local = { aws_region = "us-east-1", api_base_url = "http://localhost:3000", issuer = "http://localhost:3000" }
}
