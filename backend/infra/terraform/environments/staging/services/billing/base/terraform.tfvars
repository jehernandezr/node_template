region       = "us-east-1"
state_bucket = "node-template-staging-tfstate"

service_name = "billing"

# API runtime and what it may use. The service stack runs it with the routes and sizes of its own tfvars.
api = { runtime = "fargate" }

workers = {
  usage    = { queue = "billing-usage" }
  identity = { queue = "billing-identity" }
}

# Non-secret values. Trial and grace days are a business decision: the service does not start without
# them, and these are the template defaults.
# INTERNAL_API_BASE_URLS is required and comes from the deployment: a JSON with the internal address of identity
# (access check) in this environment, for example "{\"identity\":\"http://identity.staging.internal\"}".
# The internal API of every service answers on the same path, so the shared ALB cannot be used to
# reach identity. The service does not start without that URL.
environment_variables = {
  INTERNAL_API_SIGNER      = "hmac"
  BILLING_TRIAL_DAYS       = "14"
  BILLING_GRACE_DAYS       = "7"
  BILLING_INVOICE_SERIES   = "FAC"
  BILLING_TRIAL_PLAN       = "inicio"
  BILLING_PAYMENT_PROVIDER = "none"
  TRUST_PROXY_HOPS         = "2"
}

# Secrets in Secrets Manager (variable name to ARN, with an optional JSON key). The service config
# requires INTERNAL_API_SHARED_SECRET.
secrets = {}

database_access = true
