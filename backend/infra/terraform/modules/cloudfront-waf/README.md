# cloudfront-waf module

CloudFront in front of the Flutter web (S3 with OAC) and the API (ALB or API Gateway), with a shared WAFv2.

## What it creates

- Private S3 bucket for the Flutter web build (KMS, versioning, mandatory TLS), reachable only by the distribution through Origin Access Control.
- Web distribution with SPA fallback: 403 and 404 return `index.html` with 200. Optimized cache and compression.
- API distribution (optional, with `api_origin_domain_name`): no cache, all methods, forwards headers, cookies and query strings, and the `CloudFront-Viewer-*` geolocation headers used by the MFA context.
- Security headers policy: HSTS, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` and optional CSP.
- CloudFront-scoped WAFv2 with the Common, KnownBadInputs, AmazonIpReputation and SQLi managed groups, a per-IP rate limit and a stricter one on `/auth/` against credential stuffing.
- WAF logs in an `aws-waf-logs-*` log group with KMS in us-east-1, with `authorization` and `cookie` redacted.

## Providers

CloudFront and CloudFront-scoped WAF only exist in us-east-1. The module declares the `aws.us_east_1` alias, which the root must pass:

```hcl
providers = {
  aws           = aws
  aws.us_east_1 = aws.us_east_1
}
```

The ACM certificate for the domains must also be in us-east-1.

## Main inputs

| Variable                                | Description                                                                        |
| --------------------------------------- | ---------------------------------------------------------------------------------- |
| `acm_certificate_arn`                   | Certificate in us-east-1 that covers all aliases.                                  |
| `web_aliases`, `api_aliases`            | Domains of each distribution.                                                      |
| `api_origin_domain_name`                | Origin domain. Must match its TLS certificate. Null omits the API.                 |
| `api_origin_verify_header_value`        | Secret in `X-Origin-Verify` so the ALB rejects what does not come from CloudFront. |
| `waf_block_mode`                        | `false` only counts: use it to tune rules before blocking.                         |
| `waf_rate_limit`, `waf_auth_rate_limit` | Requests per IP in 5 minutes.                                                      |
| `content_security_policy`               | CSP tailored to the Flutter web.                                                   |

## Outputs

`web_bucket_name`, `web_bucket_arn`, `web_kms_key_arn`, `web_distribution_id`, `web_distribution_arn`, `web_domain_name`, `api_distribution_id`, `api_distribution_arn`, `api_domain_name`, `cloudfront_hosted_zone_id`, `web_acl_arn`, `waf_log_group_name`.

## Notes

- The module does not create DNS records. The root points the aliases to `web_domain_name` and `api_domain_name` with `cloudfront_hosted_zone_id`.
- Socket.IO and SSE go directly to the realtime ALB, not through CloudFront, because of the origin read timeouts.
- With `api_origin_verify_header_value`, the root adds a rule to the ALB that requires that header.
- The pipeline that publishes the web needs `s3:PutObject` on the bucket, `kms:GenerateDataKey` on `web_kms_key_arn` and `cloudfront:CreateInvalidation`.
