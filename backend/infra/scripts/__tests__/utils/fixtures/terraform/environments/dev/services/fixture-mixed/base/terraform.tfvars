region       = "us-east-1"
state_bucket = "fixture-tfstate"
service_name = "fixture_mixed"

api = {
  runtime = "fargate"
}

workers = {
  jobs = {
    queue = "fixture-jobs"
  }
}

consumers = {
  mail = {
    queue = "fixture-mail"
  }
}
