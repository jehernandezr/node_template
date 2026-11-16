# kms-key

CMK con rotación anual y la política base de la plataforma: la cuenta la administra con IAM, CloudWatch Logs cifra solo los log groups indicados y los servicios de AWS listados (SNS, SQS, SES, CloudFront...) la usan solo para recursos de la cuenta (`aws:SourceAccount`).

Todos los módulos crean sus claves con este, así un ajuste a la política se hace en un solo lugar.

```hcl
module "kms" {
  source = "../kms-key"

  alias       = "${var.name_prefix}-messaging"
  description = "Cifrado de tópicos y colas"
  service_principals = [
    { sid = "AllowSnsUse", services = ["sns.amazonaws.com"] },
    { sid = "AllowSqsUse", services = ["sqs.amazonaws.com"] },
  ]
}
```
