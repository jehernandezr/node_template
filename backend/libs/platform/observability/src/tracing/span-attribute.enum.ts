/** Span attributes added by the platform. */
export enum SpanAttribute {
  /** Error type (semconv `error.type`): the platform code or the error name. */
  ErrorType = 'error.type',
  /** `SERVICE.SUBMODULE.ERROR` code of the error. */
  ErrorCode = 'error.code',
  /** Trace id from the `traceparent` of an external client. */
  ExternalTraceId = 'platform.external_trace_id',
}
