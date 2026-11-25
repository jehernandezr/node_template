/** HTTP headers of the service-to-service protocol. Always lowercase, as Node delivers them. */
export enum InternalHeader {
  Traceparent = 'traceparent',
  TenantId = 'x-tenant-id',
  ActorId = 'x-actor-id',
  IdempotencyKey = 'x-idempotency-key',
  /** `CallMeta.deadline`, in epoch milliseconds. */
  Deadline = 'x-call-deadline',
  /** `CallMeta.timeoutMs`. */
  TimeoutMs = 'x-call-timeout-ms',
  /** Instant the call was signed, in epoch milliseconds. */
  Timestamp = 'x-internal-timestamp',
  /** HMAC-SHA256 signature in hexadecimal. */
  Signature = 'x-internal-signature',
  ContentType = 'content-type',
  RetryAfter = 'retry-after',
}
