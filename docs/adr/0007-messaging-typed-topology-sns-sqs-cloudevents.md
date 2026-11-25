# 0007. Messaging with a typed topology, SNS/SQS and CloudEvents

- Status: Accepted
- Date: 2026-11-11

## Context

Services need to publish events and send commands without coupling to a broker. They need retries with real backoff, isolation of failing messages, and messages that external consumers can understand.

## Decision

`libs/platform/messaging` dispatches events and commands. The typed topology, with `TopicDef`, `QueueDef` and `Route`, is the single source of truth. From it come the runtime dispatch, the infrastructure (Terraform), the local environment, the tests and the documentation (AsyncAPI).

- AWS adapter: SNS for topics and SQS for queues, with one queue per consumer.
- Format: CloudEvents 1.0 with types such as `tasks.task.updated.v1`, and the attributes `traceparent`, `tenantid` and `actorid`.
- Retries: the dispatcher computes `base · 2^attempt + jitter` and applies it with `ChangeMessageVisibility`. Permanent errors go straight to the DLQ. A queue uses 10 attempts by default, which with a 1 s base and a 5 min cap cover several minutes of an outage. An infrastructure failure of the consumer (the claim or its close does not reach the database) is always retried and does not count against the attempts; `maxReceiveCount` defaults to ten times the attempts, because SQS also counts those receives and the redeliveries of a message in flight. Handler errors are classified with the service's `FailureClassifier`, which recognizes Postgres's transient SQLSTATEs.
- Outbox: the event is stored in the same transaction as the change and published after the commit. `Dead` is reserved for what can never be delivered (no route, too large or outside the contract). A transport failure is retried without limit with the policy's wait, capped at `maxMs`, and the rejection of an open circuit breaker does not count as an attempt. Each pass publishes its report as counters (`messaging.outbox.published`, `failed`, `dead`, `deferred` and `stale`) for alarms, and a dead record is logged as an error.
- Consumers with `@Subscribe`. Each one validates the schema and checks idempotency in `processed_messages`.

## Consequences

Positive:

- Changing the broker means changing the adapter, not the business code.
- Terraform and the local environment come from the same declaration as the code.
- Exponential backoff lives in the platform, because SQS only retries at a fixed interval.

Costs:

- The topology is code that must be kept in sync. At startup it is validated that each route points to a declared topic or queue.
- The outbox adds a table and a periodic sweep.
- A `Dead` record does not block its FIFO group: it will never be delivered and would hold back the ones behind it forever. There is no resend command, because resending unchanged a record that has no route or breaks the contract fails the same way; it is fixed by hand.
- The alarms on the outbox counters are declared with the deployment's observability infrastructure.
- Each consumer must maintain its idempotency table.

## Alternatives considered

- Topics in Google Pub/Sub or Kafka.
- Queues in RabbitMQ, or in BullMQ on Valkey for development.
- Synchronous query through the internal API (`TasksOperation.GetTaskSummary`) when an immediate piece of data is needed that is not worth copying.
