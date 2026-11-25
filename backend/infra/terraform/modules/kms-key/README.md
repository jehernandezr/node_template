# kms-key

CMK with yearly rotation and the platform's base policy: the account manages it through IAM, CloudWatch Logs encrypts only the given log groups and the listed AWS services (SNS, SQS, SES, CloudFront...) use it only for resources of the account (`aws:SourceAccount`).

Every module creates its keys with this one, so a policy adjustment is made in a single place.

```hcl
module "kms" {
  source = "../kms-key"

  alias       = "${var.name_prefix}-messaging"
  description = "Encryption of topics and queues"
  service_principals = [
    { sid = "AllowSnsUse", services = ["sns.amazonaws.com"] },
    { sid = "AllowSqsUse", services = ["sqs.amazonaws.com"] },
  ]
}
```
