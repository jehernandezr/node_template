region       = "us-east-1"
state_bucket = "node-template-dev-tfstate"

# CloudFront with WAF in front of the web app and the API. Not created without a certificate.
# cloudfront_certificate_arn = "arn:aws:acm:us-east-1:111111111111:certificate/REPLACE" # Must be in us-east-1.
# web_aliases                = ["app.dev.example.com"]
# api_aliases                = ["api.dev.example.com"]
# realtime_hostname          = "rt.dev.example.com"
# route53_zone_id            = "ZREPLACE"
# waf_block_mode             = false # Count only while you tune the rules.

force_destroy_buckets = true
