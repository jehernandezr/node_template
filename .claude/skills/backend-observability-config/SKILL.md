---
name: backend-observability-config
description: 'Backend configuration with zod, logging, traces, metrics, health and timeouts. Use it when adding an environment variable, a log, a metric or a health check.'
paths:
  - 'backend/**/config/**'
  - 'backend/libs/platform/config/**'
  - 'backend/libs/platform/observability/**'
  - 'backend/.env.example'
---

# Configuration and observability

References: ADR 0004 (OpenTelemetry and OpenObserve), ADR 0003 (the `traceId` is a UUIDv7).

## Validated configuration

- Every environment variable is declared in a zod schema in `@platform/config`, with a type, a sensible default and a description. It is validated once at startup: if it is missing or invalid, the process does not start and the message says which variable failed and why, without printing a secret's value. <!-- id: backend-observability-config.1 -->
- The result is a typed, immutable object that gets injected (`AppConfig`). Nobody reads `process.env` outside `@platform/config`. <!-- id: backend-observability-config.2 -->
- A library reads its section with `ConfigModule.forFeature(section)` and its token. A service reads its own schema through a `RootSettings<T>` subclass in its `config/` folder (`BillingSettings`); use cases and adapters inject that class, never `AppConfig.root<X>()`. <!-- id: backend-observability-config.3 -->
- Configuration is grouped by topic (`database`, `messaging`, `auth`), not a flat list. Numbers carry their unit in the name (`timeoutMs`, `ttlSeconds`). <!-- id: backend-observability-config.4 -->
- Values that depend on the environment (URLs, pool sizes) come from the environment. Business rules are not configuration: they are code. <!-- id: backend-observability-config.5 -->
- Changing a behavior option at runtime (log level) goes through a feature flag, not a restart. <!-- id: backend-observability-config.6 -->
- New variable: add it to the schema, to `.env.example` and to Terraform in the same change. <!-- id: backend-observability-config.7 -->

```ts
export const databaseConfigSchema = z.strictObject({
  DB_URL: z.string().url(),
  DB_POOL_SIZE: z.coerce.number().int().min(1).max(50).default(10),
  DB_SLOW_QUERY_MS: z.coerce.number().int().min(1).default(500),
});
```

## Structured logging

- Always through an injected `LoggerPort`, never `console.log`. JSON to stdout (or OTLP), with `trace_id` and `span_id`. <!-- id: backend-observability-config.8 -->
- A fixed message with the data as fields, not interpolated: `logger.info('user registered', { userId })`. That way they can be filtered and aggregated. <!-- id: backend-observability-config.9 -->
- Levels: `error` for what needs action, `warn` for recoverable degradation, `info` for relevant business events and state changes, `debug` for diagnostics (off by default, sampled with `LOG_SAMPLE_RATE` and `LOG_DEBUG_CONTEXTS`). <!-- id: backend-observability-config.10 -->
- An error is logged once, where it is handled (the filter, the consumer handler), with its cause. It is not logged and rethrown at every layer. <!-- id: backend-observability-config.11 -->
- Never secrets, tokens, passwords, ID documents or full email addresses. Log ids. <!-- id: backend-observability-config.12 -->
- The context (`tenantId`, `actorId`, `traceId`) comes from the async context, it is not passed by hand through every method. <!-- id: backend-observability-config.13 -->
- Every request, message and job creates or continues a `traceId` (UUIDv7) and returns or propagates it (`traceparent`). <!-- id: backend-observability-config.14 -->

## Traces and metrics

- Auto-instrumentation covers HTTP, NestJS, database, Valkey, AWS and `fetch`. Add your own spans in use cases, saga steps, consumers and jobs, with a stable name (`users.sign_in`) and low-cardinality attributes. <!-- id: backend-observability-config.15 -->
- Metrics with bounded labels: never user or tenant ids as a label. <!-- id: backend-observability-config.16 -->
- Every critical use case measures latency and error rate. Every queue measures depth, age of the oldest message and DLQ. <!-- id: backend-observability-config.17 -->
- A central error handler per trigger type counts and logs errors, see `backend-errors`. <!-- id: backend-observability-config.18 -->

## Health and shutdown

- `GET /health/live`: the process responds. It does not touch dependencies. <!-- id: backend-observability-config.19 -->
- `GET /health/ready`: the essential database, cache and config respond, with a short time limit. If it fails, the load balancer stops sending traffic, but the process is not restarted. <!-- id: backend-observability-config.20 -->
- Graceful shutdown with `enableShutdownHooks()`: stop accepting traffic, finish in-flight work, close consumers, then pools. The deadline is shorter than the orchestrator's. <!-- id: backend-observability-config.21 -->
- No PM2 or self-restart: the platform restarts. <!-- id: backend-observability-config.22 -->

## Timeouts and resilience

- Every network call has a timeout, and every retried call is idempotent. Use `@platform/resilience` (timeout, backoff with jitter, circuit breaker), not hand-written loops. <!-- id: backend-observability-config.23 -->
- The total budget of an operation (attempts plus waits) fits within its deadline. <!-- id: backend-observability-config.24 -->
- A dependency that is down degrades gracefully when an alternative exists (stale cache), and otherwise responds 503 with `Retry-After`. <!-- id: backend-observability-config.25 -->

## Review

```
- [ ] New variable in the zod schema, .env.example and Terraform
- [ ] Nobody reads process.env outside @platform/config
- [ ] Logs with a fixed message, fields and no sensitive data
- [ ] Own span in the new use case or consumer
- [ ] Timeout on every new network call
```

## With pstack

Method in `pstack-in-node-template`. From pstack these apply here: `principle-explain-the-number`, `benchmark-checklist`, `principle-boundary-discipline`, `runtime-forensics`, `poteto-mode`.
