/** Atributos que acompañan un mensaje copiado a la DLQ. */
export enum DeadLetterAttribute {
  Error = 'platform-error',
  ErrorCode = 'platform-error-code',
  SourceQueue = 'platform-source-queue',
}
