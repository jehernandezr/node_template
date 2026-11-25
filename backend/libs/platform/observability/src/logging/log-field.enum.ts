/**
 * Fixed fields of each line. `trace_id` and `span_id` use the OpenTelemetry names and
 * format (32/16 hex), so OpenObserve opens the trace from
 * the log. A caller field with the same name is discarded.
 */
export enum LogField {
  Timestamp = 'timestamp',
  Level = 'level',
  Service = 'service',
  Context = 'context',
  Message = 'message',
  TraceId = 'trace_id',
  SpanId = 'span_id',
  /** The context carried a malformed `traceId`; the value is never written. */
  TraceIdInvalid = 'trace_id_invalid',
  ExternalTraceId = 'external_trace_id',
  TenantId = 'tenant_id',
  ActorId = 'actor_id',
  ActorType = 'actor_type',
  UserId = 'user_id',
  Region = 'region',
}
