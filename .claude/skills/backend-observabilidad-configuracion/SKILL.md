---
name: backend-observabilidad-configuracion
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

- Every environment variable is declared in a zod schema in `@platform/config`, with a type, a sensible default and a description. It is validated once at startup: if it is missing or invalid, the process does not start and the message says which variable failed and why, without printing a secret's value.
- The result is a typed, immutable object that gets injected (`AppConfig`). Nobody reads `process.env` outside `@platform/config`.
- Configuration is grouped by topic (`database`, `messaging`, `auth`), not a flat list. Numbers carry their unit in the name (`timeoutMs`, `ttlSeconds`).
- Values that depend on the environment (URLs, pool sizes) come from the environment. Business rules are not configuration: they are code.
- Changing a behavior option at runtime (log level) goes through a feature flag, not a restart.
- New variable: add it to the schema, to `.env.example` and to Terraform in the same change.

```ts
export const databaseConfigSchema = z.strictObject({
  DB_URL: z.string().url(),
  DB_POOL_SIZE: z.coerce.number().int().min(1).max(50).default(10),
  DB_SLOW_QUERY_MS: z.coerce.number().int().min(1).default(500),
});
```

## Structured logging

- Always through an injected `LoggerPort`, never `console.log`. JSON to stdout (or OTLP), with `trace_id` and `span_id`.
- A fixed message with the data as fields, not interpolated: `logger.info('user registered', { userId })`. That way they can be filtered and aggregated.
- Levels: `error` for what needs action, `warn` for recoverable degradation, `info` for relevant business events and state changes, `debug` for diagnostics (off by default, sampled with `LOG_SAMPLE_RATE` and `LOG_DEBUG_CONTEXTS`).
- An error is logged once, where it is handled (the filter, the consumer handler), with its cause. It is not logged and rethrown at every layer.
- Never secrets, tokens, passwords, ID documents or full email addresses. Log ids.
- The context (`tenantId`, `actorId`, `traceId`) comes from the async context, it is not passed by hand through every method.
- Every request, message and job creates or continues a `traceId` (UUIDv7) and returns or propagates it (`traceparent`).

## Traces and metrics

- Auto-instrumentation covers HTTP, NestJS, database, Valkey, AWS and `fetch`. Add your own spans in use cases, saga steps, consumers and jobs, with a stable name (`users.sign_in`) and low-cardinality attributes.
- Metrics with bounded labels: never user or tenant ids as a label.
- Every critical use case measures latency and error rate. Every queue measures depth, age of the oldest message and DLQ.
- A central error handler per trigger type counts and logs errors, see `backend-errores`.

## Health and shutdown

- `GET /health/live`: the process responds. It does not touch dependencies.
- `GET /health/ready`: the essential database, cache and config respond, with a short time limit. If it fails, the load balancer stops sending traffic, but the process is not restarted.
- Graceful shutdown with `enableShutdownHooks()`: stop accepting traffic, finish in-flight work, close consumers, then pools. The deadline is shorter than the orchestrator's.
- No PM2 or self-restart: the platform restarts.

## Timeouts and resilience

- Every network call has a timeout, and every retried call is idempotent. Use `@platform/resilience` (timeout, backoff with jitter, circuit breaker), not hand-written loops.
- The total budget of an operation (attempts plus waits) fits within its deadline.
- A dependency that is down degrades gracefully when an alternative exists (stale cache), and otherwise responds 503 with `Retry-After`.

## Review

```
- [ ] New variable in the zod schema, .env.example and Terraform
- [ ] Nobody reads process.env outside @platform/config
- [ ] Logs with a fixed message, fields and no sensitive data
- [ ] Own span in the new use case or consumer
- [ ] Timeout on every new network call
```

## With pstack

Method in `pstack-en-node-template`. From pstack these apply here: `principle-explain-the-number`, `benchmark-checklist`, `principle-boundary-discipline`, `runtime-forensics`, `poteto-mode`.
