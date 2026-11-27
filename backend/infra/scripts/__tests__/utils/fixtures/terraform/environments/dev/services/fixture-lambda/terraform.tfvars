region       = "us-east-1"
state_bucket = "fixture-tfstate"
service_name = "fixture_lambda"

api = {
  route_prefixes = ["/v1/fixture-lambda"]
}
