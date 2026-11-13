region       = "us-east-1"
environment  = "dev"
name_prefix  = "node-template-dev"
state_bucket = "node-template-dev-tfstate"

# CloudFront con WAF delante de la web y la API. Sin certificado no se crea.
# cloudfront_certificate_arn = "arn:aws:acm:us-east-1:111111111111:certificate/REEMPLAZAR" # Debe estar en us-east-1.
# web_aliases                = ["app.dev.example.com"]
# api_aliases                = ["api.dev.example.com"]
# realtime_hostname          = "rt.dev.example.com"
# route53_zone_id            = "ZREEMPLAZAR"
# waf_block_mode             = false # Solo cuenta mientras afinas reglas.

force_destroy_buckets = true
