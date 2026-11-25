region       = "us-east-1"
environment  = "staging"
name_prefix  = "node-template-staging"
state_bucket = "node-template-staging-tfstate"

service_name = "billing"

# API on Fargate behind the internal ALB. The API process also runs the jobs (period closing and
# delinquency); the workers apply the usage that services send and the membership changes from identity.
api = {
  runtime                = "fargate"
  route_prefixes         = ["/v1/billing"]
  listener_rule_priority = 150
  desired_count          = 1
  min_capacity           = 1
  max_capacity           = 2
  spot                   = true
  health_check_path      = "/health/ready"
}

workers = {
  usage    = { queue = "billing-usage", max_capacity = 2 }
  identity = { queue = "billing-identity", max_capacity = 2 }
}

# Non-secret values. Trial and grace days are a business decision: the service does not start without
# them, and these are the template defaults.
# INTERNAL_API_BASE_URLS is required and comes from the deployment: a JSON with the internal address of identity
# (access check) in this environment, for example "{\"identity\":\"http://identity.staging.internal\"}".
# The internal API of every service answers on the same path, so the shared ALB cannot be used to
# reach identity. The service does not start without that URL.
environment_variables = {
  INTERNAL_API_SIGNER          = "hmac"
  BILLING_TRIAL_DAYS           = "14"
  BILLING_GRACE_DAYS           = "7"
  BILLING_INVOICE_SERIES       = "FAC"
  BILLING_TRIAL_PLAN           = "inicio"
  BILLING_PAYMENT_PROVIDER     = "fake"
  BILLING_FAKE_PAYMENT_OUTCOME = "approved"
  TRUST_PROXY_HOPS             = "2"
}

# Secrets in Secrets Manager (variable name to ARN, with an optional JSON key). The service config
# requires INTERNAL_API_SHARED_SECRET.
secrets = {}

database_access = true
valkey_access   = true
