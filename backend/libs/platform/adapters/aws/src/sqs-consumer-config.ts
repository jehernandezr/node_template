import { MessagingError, MessagingErrorCode } from '@platform/messaging';

/** Ajustes del consumo de una cola SQS. Lo que falta toma el valor por defecto. */
export interface SqsConsumerSettings {
  /** Mensajes por `ReceiveMessage`, de 1 a 10. */
  readonly batchSize?: number;
  /** Long polling en segundos, de 0 a 20. */
  readonly waitTimeSeconds?: number;
  /** Pausa en milisegundos después de un error del ciclo de polling. */
  readonly errorDelayMs?: number;
}

/** Ajustes del consumo de una cola SQS ya validados, con sus valores por defecto. */
export class SqsConsumerConfig {
  /** Visibilidad máxima de SQS (12 h). */
  static readonly MAX_VISIBILITY_SECONDS = 43_200;
  /** Largo máximo del motivo copiado a la DLQ. */
  static readonly MAX_ERROR_ATTRIBUTE_LENGTH = 1_024;
  /** Mensajes que SQS entrega por lote como máximo. */
  static readonly MAX_BATCH_SIZE = 10;
  static readonly DEFAULT_BATCH_SIZE = 10;
  static readonly DEFAULT_WAIT_TIME_SECONDS = 20;
  static readonly DEFAULT_ERROR_DELAY_MS = 1_000;
  private static readonly MAX_WAIT_TIME_SECONDS = 20;
  private static readonly MAX_ERROR_DELAY_MS = 3_600_000;

  readonly batchSize: number;
  readonly waitTimeSeconds: number;
  readonly errorDelayMs: number;

  /** @throws MessagingError `InvalidOptions` cuando un valor sale de su rango. */
  constructor(settings: SqsConsumerSettings = {}) {
    this.batchSize = SqsConsumerConfig.checked(
      'batchSize',
      settings.batchSize ?? SqsConsumerConfig.DEFAULT_BATCH_SIZE,
      1,
      SqsConsumerConfig.MAX_BATCH_SIZE,
    );
    this.waitTimeSeconds = SqsConsumerConfig.checked(
      'waitTimeSeconds',
      settings.waitTimeSeconds ?? SqsConsumerConfig.DEFAULT_WAIT_TIME_SECONDS,
      0,
      SqsConsumerConfig.MAX_WAIT_TIME_SECONDS,
    );
    this.errorDelayMs = SqsConsumerConfig.checked(
      'errorDelayMs',
      settings.errorDelayMs ?? SqsConsumerConfig.DEFAULT_ERROR_DELAY_MS,
      0,
      SqsConsumerConfig.MAX_ERROR_DELAY_MS,
    );
  }

  private static checked(
    name: string,
    value: number,
    min: number,
    max: number,
  ): number {
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new MessagingError(
        MessagingErrorCode.InvalidOptions,
        `${name} must be an integer between ${min} and ${max}`,
      );
    }
    return value;
  }
}
