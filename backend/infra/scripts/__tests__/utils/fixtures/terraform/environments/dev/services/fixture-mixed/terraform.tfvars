region       = "us-east-1"
state_bucket = "fixture-tfstate"
service_name = "fixture_mixed"

api = {
  route_prefixes = ["/v1/fixture-mixed"]
}

workers = {
  jobs = {}
}

consumers = {
  mail = {
    handler = "mail.handler"
  }
}
