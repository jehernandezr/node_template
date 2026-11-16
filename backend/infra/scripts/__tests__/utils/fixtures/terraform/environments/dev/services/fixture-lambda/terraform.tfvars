region       = "us-east-1"
environment  = "dev"
name_prefix  = "fixture-dev"
state_bucket = "fixture-tfstate"
service_name = "fixture-lambda"

api = {
  runtime        = "lambda"
  route_prefixes = ["/v1/fixture-lambda"]
}
