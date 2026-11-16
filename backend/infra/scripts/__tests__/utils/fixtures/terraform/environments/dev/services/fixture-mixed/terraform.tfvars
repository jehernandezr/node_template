region       = "us-east-1"
environment  = "dev"
name_prefix  = "fixture-dev"
state_bucket = "fixture-tfstate"
service_name = "fixture-mixed"

api = {
  runtime                = "fargate"
  route_prefixes         = ["/v1/fixture-mixed"]
  listener_rule_priority = 901
}

workers = {
  jobs = {
    queue = "fixture-jobs"
  }
}

consumers = {
  mail = {
    queue   = "fixture-mail"
    handler = "mail.handler"
  }
}
