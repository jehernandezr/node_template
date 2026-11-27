# Values shared by every stack of the environment. deploy-aws.sh passes this file before each stack's
# terraform.tfvars, and a stack's terraform.tfvars never repeats a key set here.
environment = "staging"
name_prefix = "node-template-staging"

# Apex domain of the product. The global stack creates staging.<domain> and prints its name servers for the
# delegation from the apex zone in the prod account.
domain = "example.com"
