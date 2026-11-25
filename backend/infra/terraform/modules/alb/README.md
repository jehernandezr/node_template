# alb module

Application load balancer. Internet-facing for realtime (Socket.IO and SSE) or internal (`internal = true`) for the Fargate APIs behind the API Gateway VPC link.

## What it creates

- ALB with an HTTPS listener (ACM certificate, TLS 1.3/1.2 policy) and an HTTP listener that redirects to HTTPS with 301. An internal ALB without a certificate listens only on HTTP inside the VPC.
- A default 404 response, or a default target group with `default_target_group_key`.
- Security group with ingress only on 80 and 443 from the given CIDRs or prefix lists. It has no egress: each service opens its own (`service-fargate` adds the rule toward its security group).
- Private S3 access logs bucket, with mandatory TLS, SSE-S3 encryption (ELB does not support KMS for access logs) and expiration.
- Optional target groups without sticky sessions (`stickiness.enabled = false`).

## Main inputs

| Variable                                         | Description                                                                |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| `name_prefix`, `vpc_id`, `subnet_ids`            | Name, VPC and public subnets (at least two).                               |
| `certificate_arn`                                | ACM certificate of the HTTPS listener.                                     |
| `idle_timeout_seconds`                           | 3600 by default, for long connections. Maximum 4000.                       |
| `ingress_cidr_blocks`, `ingress_prefix_list_ids` | Who reaches the ALB. With CloudFront in front, use its origin prefix list. |
| `deletion_protection`                            | On by default.                                                             |
| `target_groups`, `default_target_group_key`      | Optional shared target groups.                                             |

## Outputs

`arn`, `arn_suffix`, `dns_name`, `zone_id`, `security_group_id`, `listener_arn` (where services attach their rules), `listener_port`, `https_listener_arn`, `http_listener_arn`, `target_group_arns`, `access_logs_bucket`.

## Notes

- WebSocket and SSE need an `idle_timeout_seconds` greater than the application's ping interval.
- Socket.IO uses only WebSocket, which is why there is no stickiness.
