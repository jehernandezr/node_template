# http-api module

API Gateway HTTP shared by all services. CloudFront with WAF sits in front (edge stack) and each service adds its routes from its own stack with the `api-routes` module.

## What it creates

- HTTP API with the `$default` stage, automatic deployment, rate limits and JSON access logs (log group with retention and CMK).
- Origin verification: a Secrets Manager secret with the `X-Origin-Verify` value (an ephemeral password written with a write-only attribute, outside the platform state; the edge state does store it because CloudFront sends it as a header) and a REQUEST Lambda authorizer with per-value caching that accepts `AWSCURRENT` and `AWSPREVIOUS` and reloads the secret every 5 minutes. Without the header, API Gateway responds 401 without invoking the function.
- Optional (`vpc_link`): VPC link with its security group, for APIs that run on Fargate behind an internal ALB. The egress toward the ALB is declared by whoever knows it (platform stack).

## Outputs

`api_id`, `execution_arn`, `endpoint_host` (CloudFront origin), `vpc_link_id`, `vpc_link_security_group_id`, `authorizer_id`, `origin_verify_secret_arn`, `kms_key_arn`.

## Notes

- To rotate the origin secret, bump `origin_verify_secret_version`, apply platform, wait at least 5 minutes (the authorizer reload) and apply edge. In the meantime CloudFront keeps sending the previous value, which the authorizer accepts as `AWSPREVIOUS`. Do not rotate twice without applying edge in between.
- The maximum time of an API Gateway HTTP integration is 30 seconds. Long connections (Socket.IO and SSE) go through the realtime ALB.
