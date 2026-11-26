region       = "us-east-1"
environment  = "dev"
name_prefix  = "fixture-dev"
state_bucket = "fixture-tfstate"
service_name = "fixture-fargate"

api = {
  runtime                = "fargate"
  route_prefixes         = ["/v1/fixture"]
}
