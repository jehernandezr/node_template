/** Cuánto se conserva lo terminado antes de que los jobs de retención lo borren. */
export interface MessagingRetention {
  /** Registros publicados del outbox. Por defecto 7 días. */
  readonly outboxMs?: number;
  /**
   * Mensajes procesados. Debe superar la retención máxima de la cola (14 días en
   * SQS) para que un duplicado tardío no se procese otra vez. Por defecto 30 días.
   */
  readonly processedMs?: number;
}
