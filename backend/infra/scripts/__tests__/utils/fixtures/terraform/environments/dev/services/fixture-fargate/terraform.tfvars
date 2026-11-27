region       = "us-east-1"
state_bucket = "fixture-tfstate"
service_name = "fixture-fargate"

api = {
  route_prefixes = ["/v1/fixture"]
}
