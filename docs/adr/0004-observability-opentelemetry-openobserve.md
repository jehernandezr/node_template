# 0004. Observability with OpenTelemetry and OpenObserve

- Status: Accepted, amended by [ADR 0046](0046-providers-and-telemetry-per-environment.md) (no Collector in AWS: each process exports OTLP/HTTP to OpenObserve with head sampling)
- Date: 2026-11-11

## Context

A request goes through HTTP, queues, sagas and jobs, and can cross several services. Logs, metrics and traces need to be visible and linked by the same `traceId`, without depending on a closed vendor and with the same tool in every environment.

## Decision

OpenTelemetry (OTel) produces logs, traces and metrics. Automatic instrumentation covers HTTP, NestJS, `pg`, the Valkey client, the AWS SDK and `fetch`. There are custom spans in use cases, saga steps, message handlers and jobs.

OpenObserve is the only tool for logs, metrics, traces, dashboards and alerts in every environment. It runs as a container locally and as a Fargate task with S3 storage on AWS.

An OpenTelemetry Collector receives and forwards everything: as an ADOT layer in Lambda, as a sidecar in Fargate and inside `docker-compose` locally. The `LoggerPort` writes JSON with `trace_id` and `span_id` to a single destination: OTLP with telemetry on and stdout with it off. The Valkey instrumentation reapplies the ioredis one to the `iovalkey` module and its spans do not carry the key. The environment of the traces comes from `DEPLOY_ENVIRONMENT`. Retention is 14 days in dev and 30 in prod.

## Consequences

Positive:

- Every log opens its complete trace.
- Changing backends means changing the Collector configuration.

Costs:

- OpenObserve is a service the team operates locally and on Fargate.
- Trace sampling and log volume have to be controlled with levels, sampling and debug contexts.

## Alternatives considered

- SigNoz: more complete APM views, on Docker Compose and ClickHouse. The document lists it as an alternative if deeper trace analysis is needed.
- Any OTel-compatible backend, by changing the Collector configuration.
