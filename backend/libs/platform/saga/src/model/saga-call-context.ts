/**
 * Contexto de las llamadas de una saga, guardado con la instancia. Todo
 * intento de todo paso, también tras una recuperación, envía los mismos
 * valores, así el participante construye igual su llave de idempotencia.
 */
export interface SagaCallContext {
  readonly tenantId?: string;
  readonly actorId?: string;
  readonly traceparent?: string;
}
