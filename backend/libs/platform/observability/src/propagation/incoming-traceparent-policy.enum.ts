/** Qué hacer con el `traceparent` de una petición entrante. */
export enum IncomingTraceparentPolicy {
  /** Continuar la traza recibida (llamadas internas, mensajes, sagas). */
  Continue = 'continue',
  /**
   * Abrir una traza nueva con un `traceId` UUIDv7 propio y guardar el trace id
   * recibido como `externalTraceId`.
   */
  External = 'external',
}
