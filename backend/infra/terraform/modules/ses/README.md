# ses module

SES domain identity with DKIM and configuration sets that publish mail events to an encrypted SNS topic.

## What it creates

- Domain identity with DKIM (RSA 2048) and a custom MAIL FROM (`mail.<domain>`), to align SPF with DMARC.
- DNS records in Route 53 (DKIM, MX and SPF of the MAIL FROM, DMARC) if you pass `route53_zone_id`. If not, the `dns_records` output lists what you must publish.
- Two configuration sets with mandatory TLS, reputation metrics and a suppression list for bounces and complaints:
  - `<prefix>-tracked`: delivery, bounce, complaint, open and click events. For bulk and product mail.
  - `<prefix>-security`: no open or click tracking. For security mail (codes, sign-in alerts).
- KMS-encrypted SNS topic that receives the events of both sets. The policy only allows SES from the account to publish.

## Main inputs

| Variable                   | Description                                         |
| -------------------------- | --------------------------------------------------- |
| `name_prefix`, `domain`    | Prefix and sender domain.                           |
| `route53_zone_id`          | Zone where the DNS records are created. Optional.   |
| `dmarc_policy`             | `none`, `quarantine` or `reject`. Starts at `none`. |
| `dmarc_report_email`       | Destination of the `rua` reports.                   |
| `tracked_event_types`      | Events of the tracked set.                          |
| `tracking_redirect_domain` | Custom domain for tracking links.                   |

## Outputs

`identity_arn`, `configuration_set_names`, `events_topic_arn`, `events_kms_key_arn`, `dkim_tokens`, `dns_records`, `send_policy_json`.

## Notes

- A new SES account is in the sandbox. Request production access in the console.
- Whoever subscribes to the topic (the `notifications` queue) needs `kms:Decrypt` on `events_kms_key_arn` and a queue policy that accepts SNS.
- The SPF of the root domain is not touched: the module only publishes the one for the MAIL FROM subdomain.
