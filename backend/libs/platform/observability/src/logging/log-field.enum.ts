/**
 * Campos fijos de cada línea. `trace_id` y `span_id` usan los nombres y el
 * formato (32/16 hex) de OpenTelemetry, así OpenObserve abre la traza desde
 * el log. Un campo del llamador con el mismo nombre se descarta.
 */
export enum LogField {
  Timestamp = 'timestamp',
  Level = 'level',
  Service = 'service',
  Context = 'context',
  Message = 'message',
  TraceId = 'trace_id',
  SpanId = 'span_id',
  /** El contexto traía un `traceId` malformado; nunca se escribe el valor. */
  TraceIdInvalid = 'trace_id_invalid',
  ExternalTraceId = 'external_trace_id',
  TenantId = 'tenant_id',
  ActorId = 'actor_id',
  ActorType = 'actor_type',
  UserId = 'user_id',
  Region = 'region',
}
