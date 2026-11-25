# Architecture decision records (ADR)

An ADR documents a relevant technical decision: the context that motivated it, what was chosen, its consequences and the discarded alternatives. It helps to understand why the system is the way it is without reconstructing it from the code.

The [plan's decision log](../plan/README.md#registro-de-decisiones) lists every decision with its date and links to the ADR that develops each one.

The designs of a phase or of a large piece live in [`docs/design/`](../design/) and link to the ADRs that set their decisions.

## How to add an ADR

1. Copy `0000-plantilla.md` to a new file with the next free number, for example `0015-nombre-en-kebab-case.md`.
2. Fill in the sections. An ADR takes between 15 and 30 lines.
3. Set the status to `Proposed` while it is under discussion.
4. When the team accepts it, change the status to `Accepted`.
5. If a new decision supersedes an earlier one, change the status of the old one to `Superseded by ADR NNNN` and add the row to the index. Do not delete the old ADR.
6. Add the corresponding row to the index in this file.

Numbers are not reused. File names use kebab-case and are in Spanish.

## Index

| Number | Title                                                                                                                      | Status                 |
| ------ | -------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 0001   | [Nx monorepo with pnpm and one microservice per app](0001-monorepo-nx-pnpm-microservicios.md)                              | Accepted               |
| 0002   | [Hexagonal architecture and platform-agnostic design](0002-arquitectura-hexagonal-plataforma-agnostica.md)                 | Accepted               |
| 0003   | [UUIDv7 identifiers and traceId](0003-identificadores-uuidv7-traceid.md)                                                   | Accepted               |
| 0004   | [Observability with OpenTelemetry and OpenObserve](0004-observabilidad-opentelemetry-openobserve.md)                       | Accepted               |
| 0005   | [In-house authentication with sessions and JWT](0005-autenticacion-sesiones-jwt.md)                                        | Accepted               |
| 0006   | [MFA with a registered device and passkeys](0006-mfa-dispositivo-registrado-passkeys.md)                                   | Accepted               |
| 0007   | [Messaging with a typed topology, SNS/SQS and CloudEvents](0007-mensajeria-topologia-tipada-sns-sqs-cloudevents.md)        | Accepted               |
| 0008   | [Orchestrated sagas with a persistent log](0008-sagas-orquestadas-bitacora-persistente.md)                                 | Accepted               |
| 0009   | [RDS PostgreSQL with an in-house persistence layer](0009-rds-postgresql-capa-persistencia-propia.md)                       | Superseded by ADR 0024 |
| 0010   | [Logical sharding by groups and residency by region](0010-sharding-logico-residencia-region.md)                            | Amended by ADR 0032    |
| 0011   | [Real time with Socket.IO and SSE](0011-tiempo-real-socketio-sse.md)                                                       | Amended by ADR 0034    |
| 0012   | [Flutter front with shells and microfrontends](0012-front-flutter-shells-microfrontends.md)                                | Accepted               |
| 0013   | [AI module with ports and Claude by default](0013-modulo-ia-puertos-claude.md)                                             | Accepted, not built    |
| 0014   | [Agreements and signed documents](0014-acuerdos-documentos-firmados.md)                                                    | Accepted, not built    |
| 0015   | [Repository structure and shared code per application](0015-estructura-backend-front-y-codigo-compartido.md)               | Accepted               |
| 0016   | [Internet egress with NAT only for the application subnets](0016-egress-de-red.md)                                         | Accepted               |
| 0017   | [Contract export](0017-export-de-contratos.md)                                                                             | Accepted               |
| 0018   | [Microfrontend contract](0018-contrato-de-microfrontend.md)                                                                | Accepted               |
| 0019   | [CI and toolchain](0019-ci-y-toolchain.md)                                                                                 | Accepted               |
| 0020   | [Terraform by stacks and API runtime chosen per service](0020-terraform-por-stacks-y-runtime-por-servicio.md)              | Accepted               |
| 0021   | [Valkey as the adapter for cache, routing, Bloom and invalidation](0021-adaptador-valkey.md)                               | Accepted               |
| 0022   | [Token verification and shared revocation state](0022-verificacion-de-tokens-y-estado-de-revocacion-compartido.md)         | Accepted               |
| 0023   | [Routing identity data across shards](0023-enrutamiento-de-datos-de-identity.md)                                           | Accepted               |
| 0024   | [Persistence on TypeORM with sharding and persistent sagas](0024-persistencia-typeorm-sharding-y-sagas-persistentes.md)    | Accepted               |
| 0025   | [NestJS layer per sub-entry point and ports as abstract classes](0025-capa-nestjs-por-sub-entrada-y-puertos-abstractos.md) | Accepted               |
| 0026   | [Scheduled jobs: ScheduledJob, JobLock and @platform/scheduling](0026-jobs-programados-scheduledjob-y-joblock.md)          | Accepted               |
| 0027   | [Screen patterns and shared front tests](0027-patrones-de-pantalla-y-pruebas-del-front.md)                                 | Accepted               |
| 0028   | [Real time over one stream per user](0028-tiempo-real-sobre-un-stream-por-usuario.md)                                      | Accepted               |
| 0029   | [Cross-tenant maintenance with RLS and per-shard search](0029-mantenimiento-entre-tenants-y-busqueda-por-shard.md)         | Accepted               |
| 0030   | [Identity email through notifications](0030-correo-de-identity-por-notifications.md)                                       | Accepted               |
| 0031   | [Reports, billing and identity sagas](0031-reportes-facturacion-y-sagas-de-identity.md)                                    | Amended by ADR 0036    |
| 0032   | [Moving tenants and regions](0032-traslado-de-tenants-y-regiones.md)                                                       | Accepted               |
| 0033   | [Service and module generators, and OpenAPI from the contracts](0033-generadores-y-openapi.md)                             | Accepted               |
| 0034   | [Live front repositories, SSE and region in the client](0034-repositorios-live-del-front-sse-y-region.md)                  | Accepted               |
| 0035   | [End-to-end flow of the platform](0035-flujo-de-punta-a-punta-de-la-plataforma.md)                                         | Accepted               |
| 0036   | [Identity security: factors, access and lifecycle](0036-seguridad-de-identity-factores-acceso-y-ciclo-de-vida.md)          | Accepted               |
