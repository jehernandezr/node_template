# Architecture decision records (ADR)

An ADR documents a relevant technical decision: the context that motivated it, what was chosen, its consequences and the discarded alternatives. It helps to understand why the system is the way it is without reconstructing it from the code.

The [plan's decision log](../plan/README.md#decision-log) lists every decision with its date and links to the ADR that develops each one.

The designs of a phase or of a large piece live in [`docs/design/`](../design/) and link to the ADRs that set their decisions.

## How to add an ADR

1. Copy `0000-template.md` to a new file with the next free number, for example `NNNN-name-in-kebab-case.md`, where `NNNN` is one more than the last row of the index.
2. Fill in the sections. An ADR takes between 15 and 30 lines.
3. Set the status to `Proposed` while it is under discussion.
4. When the team accepts it, change the status to `Accepted`.
5. If a new decision supersedes an earlier one, change the status of the old one to `Superseded by ADR NNNN`; if it changes only part of an earlier one, add `amended by ADR NNNN` with the amended point to the old one's status. Keep the index status equal to the file. Do not delete the old ADR.
6. Add the corresponding row to the index in this file.

Numbers are not reused. File names use kebab-case and are in English.

## Index

| Number | Title                                                                                                                 | Status                                   |
| ------ | --------------------------------------------------------------------------------------------------------------------- | ---------------------------------------- |
| 0001   | [Nx monorepo with pnpm and one microservice per app](0001-nx-monorepo-pnpm-microservices.md)                          | Accepted                                 |
| 0002   | [Hexagonal architecture and platform-agnostic design](0002-hexagonal-architecture-platform-agnostic.md)               | Accepted                                 |
| 0003   | [UUIDv7 identifiers and traceId](0003-uuidv7-identifiers-traceid.md)                                                  | Accepted                                 |
| 0004   | [Observability with OpenTelemetry and OpenObserve](0004-observability-opentelemetry-openobserve.md)                   | Amended by ADR 0046                      |
| 0005   | [In-house authentication with sessions and JWT](0005-authentication-sessions-jwt.md)                                  | Accepted                                 |
| 0006   | [MFA with a registered device and passkeys](0006-mfa-registered-device-passkeys.md)                                   | Accepted                                 |
| 0007   | [Messaging with a typed topology, SNS/SQS and CloudEvents](0007-messaging-typed-topology-sns-sqs-cloudevents.md)      | Accepted                                 |
| 0008   | [Orchestrated sagas with a persistent log](0008-orchestrated-sagas-persistent-log.md)                                 | Amended by ADR 0031                      |
| 0009   | [RDS PostgreSQL with an in-house persistence layer](0009-rds-postgresql-in-house-persistence-layer.md)                | Superseded by ADR 0024                   |
| 0010   | [Logical sharding by groups and residency by region](0010-logical-sharding-region-residency.md)                       | Amended by ADR 0023, 0024, 0032 and 0042 |
| 0011   | [Real time with Socket.IO and SSE](0011-real-time-socketio-sse.md)                                                    | Amended by ADR 0028, 0034 and 0045       |
| 0012   | [Flutter front with shells and microfrontends](0012-front-flutter-shells-microfrontends.md)                           | Accepted                                 |
| 0013   | [AI module with ports and Claude by default](0013-ai-module-ports-claude.md)                                          | Accepted, not built                      |
| 0014   | [Agreements and signed documents](0014-agreements-signed-documents.md)                                                | Accepted, not built                      |
| 0015   | [Repository structure and shared code per application](0015-repository-structure-and-shared-code.md)                  | Accepted                                 |
| 0016   | [Internet egress with NAT only for the application subnets](0016-network-egress.md)                                   | Accepted                                 |
| 0017   | [Contract export](0017-contract-export.md)                                                                            | Accepted                                 |
| 0018   | [Microfrontend contract](0018-microfrontend-contract.md)                                                              | Accepted                                 |
| 0019   | [CI and toolchain](0019-ci-and-toolchain.md)                                                                          | Amended by ADR 0043                      |
| 0020   | [Terraform by stacks and API runtime chosen per service](0020-terraform-stacks-and-runtime-per-service.md)            | Amended by ADR 0039 to 0043 and 0045     |
| 0021   | [Valkey as the adapter for cache, routing, Bloom and invalidation](0021-valkey-adapter.md)                            | Amended by ADR 0040 and 0044             |
| 0022   | [Token verification and shared revocation state](0022-token-verification-shared-revocation-state.md)                  | Accepted                                 |
| 0023   | [Routing identity data across shards](0023-identity-data-routing.md)                                                  | Amended by ADR 0029 and 0037             |
| 0024   | [Persistence on TypeORM with sharding and persistent sagas](0024-typeorm-persistence-sharding-persistent-sagas.md)    | Amended by ADR 0031, 0037, 0041 and 0043 |
| 0025   | [NestJS layer per sub-entry point and ports as abstract classes](0025-nestjs-layer-per-sub-entry-abstract-ports.md)   | Amended by ADR 0044                      |
| 0026   | [Scheduled jobs: ScheduledJob, JobLock and @platform/scheduling](0026-scheduled-jobs-scheduledjob-joblock.md)         | Amended by ADR 0039 and 0044             |
| 0027   | [Screen patterns and shared front tests](0027-front-screen-patterns-and-tests.md)                                     | Amended by ADR 0038                      |
| 0028   | [Real time over one stream per user](0028-real-time-one-stream-per-user.md)                                           | Amended by ADR 0045                      |
| 0029   | [Cross-tenant maintenance with RLS and per-shard search](0029-cross-tenant-maintenance-search-per-shard.md)           | Accepted                                 |
| 0030   | [Identity email through notifications](0030-identity-email-through-notifications.md)                                  | Amended by ADR 0040                      |
| 0031   | [Reports, billing and identity sagas](0031-reports-billing-identity-sagas.md)                                         | Amended by ADR 0036                      |
| 0032   | [Moving tenants and regions](0032-tenant-moves-and-regions.md)                                                        | Amended by ADR 0041 and 0042             |
| 0033   | [Service and module generators, and OpenAPI from the contracts](0033-generators-and-openapi.md)                       | Accepted                                 |
| 0034   | [Live front repositories, SSE and region in the client](0034-live-front-repositories-sse-region.md)                   | Accepted                                 |
| 0035   | [End-to-end flow of the platform](0035-end-to-end-platform-flow.md)                                                   | Accepted                                 |
| 0036   | [Identity security: factors, access and lifecycle](0036-identity-security-factors-access-lifecycle.md)                | Accepted                                 |
| 0037   | [Composition, shared platform pieces and domain events](0037-composition-shared-platform-pieces-and-domain-events.md) | Accepted                                 |
| 0038   | [Comment and documentation rules enforced by lint](0038-comment-and-documentation-rules-enforced-by-lint.md)          | Accepted                                 |
| 0039   | [Runtime matrix per service](0039-runtime-matrix-per-service.md)                                                      | Accepted                                 |
| 0040   | [Internal routing and authentication per runtime](0040-internal-routing-and-authentication.md)                        | Accepted                                 |
| 0041   | [Secrets inventory and database credentials](0041-secrets-and-database-credentials.md)                                | Accepted                                 |
| 0042   | [Region and catalog model for F12](0042-region-and-catalog-model.md)                                                  | Accepted                                 |
| 0043   | [Deploy, migrations and rollback](0043-deploy-migrations-and-rollback.md)                                             | Accepted                                 |
| 0044   | [Valkey failure policy](0044-valkey-failure-policy.md)                                                                | Accepted                                 |
| 0045   | [Edge, domains and real time](0045-edge-domains-and-real-time.md)                                                     | Accepted                                 |
| 0046   | [Providers per environment and telemetry in AWS](0046-providers-and-telemetry-per-environment.md)                     | Accepted                                 |
