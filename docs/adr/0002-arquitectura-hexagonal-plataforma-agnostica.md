# 0002. Hexagonal architecture and platform-agnostic design

- Status: Accepted
- Date: 2026-11-11
- Revised: 2026-11-14 (each port lives in the platform library of its capability, for example `CachePort` in `@platform/cache`, and the adapters in `libs/platform/adapters/<provider>`)

## Context

The platform deploys on AWS, but moving to another cloud should not force a rewrite of the business logic. Each service needs an internal structure that separates the domain from NestJS, TypeORM and AWS.

## Decision

Strict hexagonal architecture. The domain and the use cases do not import NestJS, TypeORM or AWS. Each external capability is a port in `libs/platform/capabilities` with one adapter per provider, and each module chooses its adapter through configuration.

- `@aws-sdk/*` appears only in `libs/platform/adapters/aws`.
- Inputs (endpoints, events, jobs, internal operations and real time) are declared with platform decorators and call use cases.
- One input adapter per runtime translates Lambda, Fargate, container, Kubernetes or local into those declarations.
- The messaging topology, the jobs and the buckets are declared abstractly. The AWS Terraform reads those declarations.

## Consequences

Positive:

- Changing clouds means writing new adapters and different Terraform, without touching the business logic.
- Changing runtimes means changing the input adapter.

Costs:

- Each port has at least two adapters (AWS and local) to maintain and test.
- The dependency rule has to be checked in CI, or the separation erodes over time.

## Alternatives considered

The document does not compare this style with other architectures. It records alternative providers for each port:

- Topics: Google Pub/Sub or Kafka.
- Queues: RabbitMQ, or BullMQ on Valkey locally.
- Files: Google Cloud Storage or Azure Blob.
- Scheduled jobs: Cloud Scheduler or Kubernetes CronJob.
- Feature flags: flagd or AppConfig.
- Secrets: Vault.
- Compute: any container.
