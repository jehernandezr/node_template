/** Atributos de span que agrega la plataforma. */
export enum SpanAttribute {
  /** Tipo de error (semconv `error.type`): el código de la plataforma o el nombre del error. */
  ErrorType = 'error.type',
  /** Código `SERVICIO.SUBMÓDULO.ERROR` del error. */
  ErrorCode = 'error.code',
  /** Trace id del `traceparent` de un cliente externo. */
  ExternalTraceId = 'platform.external_trace_id',
}
