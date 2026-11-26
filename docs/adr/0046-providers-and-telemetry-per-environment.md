# 0046. Providers per environment and telemetry in AWS

- Status: Accepted
- Date: 2026-11-26
- Related: [ADR 0004](0004-observability-opentelemetry-openobserve.md), [ADR 0031](0031-reports-billing-identity-sagas.md), [ADR 0044](0044-valkey-failure-policy.md)

## Context

The prod tfvars use `BILLING_PAYMENT_PROVIDER = "fake"` with an approved outcome, so every invoice would be marked paid without a charge. No real push provider exists, and the safeguards that reject the console mailer depend on `NODE_ENV`. ADR 0004 sends telemetry through a Collector (an ADOT layer in Lambda, a sidecar in Fargate) that no stack builds, with tail sampling that only the local Collector has. No alarm list exists per service.

## Decision

- **Providers per `DEPLOY_ENVIRONMENT`** ([ADR 0044](0044-valkey-failure-policy.md) makes it the only safeguard source):

| Variable                     | `local` | `dev`              | `staging`, `prod`                        |
| ---------------------------- | ------- | ------------------ | ---------------------------------------- |
| `BILLING_PAYMENT_PROVIDER`   | any     | `fake` or `none`   | `none`                                   |
| `NOTIFICATIONS_PUSH_SENDER`  | any     | `memory` or `none` | `none`                                   |
| `IDENTITY_MAILER`            | any     | `notifications`    | `notifications`                          |
| `NOTIFICATIONS_EMAIL_SENDER` | any     | `ses`              | `ses`                                    |
| `IDENTITY_SMOKE_ACCOUNT`     | allowed | allowed            | allowed in `staging`, rejected in `prod` |

- A value outside its column fails configuration validation at start-up.
- **`none` payment provider.** It never charges: closing a period issues the invoice and leaves it `Issued`, so no invoice becomes `Paid` or `Failed` and delinquency never starts. It is replaced when a real provider lands.
- **`none` push sender.** It delivers nothing and records the push as skipped; notifications still reach the inbox and email. It is replaced when APNs, FCM and Web Push land.
- **Telemetry in AWS.** The OpenTelemetry SDK in each bundle exports OTLP/HTTP straight to OpenObserve, in Fargate and in Lambda (which flushes before the handler returns). No Collector runs in AWS: no sidecar and no ADOT layer. Traces use head sampling, `parentbased_traceidratio` with `OTEL_TRACES_SAMPLER_ARG` 1.0 in `dev`, 0.2 in `staging` and 0.05 in `prod`; logs and metrics are not sampled. The Collector with tail sampling stays in the local stack.
- **OpenObserve** runs in the `platform` stack behind its internal ALB, and its security group admits only the VPC CIDR. Operators reach the console through SSM port forwarding (ECS Exec on the OpenObserve task). Its root credentials are in [ADR 0041](0041-secrets-and-database-credentials.md).
- **Alarm catalog per service**, created by the `service` stack and sent to the `platform` alarm topic (email from the user): 5xx rate, p99 latency, DLQ not empty, oldest message age, sagas in `RequiresIntervention`; and per environment from `data`: RDS CPU, free storage, replica lag, pinned proxy connections, Valkey memory.

## Consequences

### Positive

- No fake reaches `staging` or `prod`, and no adapter pretends to charge or deliver.
- Telemetry needs no extra container or layer, and a span reaches OpenObserve with one hop.

### Costs

- Billing in `staging` and `prod` issues invoices nobody collects until a real provider exists.
- Head sampling can drop a trace with an error in `staging` and `prod`; tail sampling in AWS is a backlog item.
- Changing the telemetry backend means changing the exporter endpoint and headers of every service.

## Alternatives considered

- Keep `fake` with a failing outcome in prod: invoices would fail and suspend tenants.
- The Collector as a Fargate sidecar and an ADOT layer: one more container per task and one more layer per function, for tail sampling F12 does not need.
- A public OpenObserve with its own login: one more public entry point.
