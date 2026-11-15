/** Cabeceras HTTP del protocolo entre servicios. Siempre en minúscula, como las entrega Node. */
export enum InternalHeader {
  Traceparent = 'traceparent',
  TenantId = 'x-tenant-id',
  ActorId = 'x-actor-id',
  IdempotencyKey = 'x-idempotency-key',
  /** `CallMeta.deadline`, en milisegundos epoch. */
  Deadline = 'x-call-deadline',
  /** `CallMeta.timeoutMs`. */
  TimeoutMs = 'x-call-timeout-ms',
  /** Instante en que se firmó la llamada, en milisegundos epoch. */
  Timestamp = 'x-internal-timestamp',
  /** Firma HMAC-SHA256 en hexadecimal. */
  Signature = 'x-internal-signature',
  ContentType = 'content-type',
  RetryAfter = 'retry-after',
}
