import { MessagingError, MessagingErrorCode } from '@platform/messaging';

/** Consumption settings of an SQS queue. Whatever is missing takes the default value. */
export interface SqsConsumerSettings {
  /** Messages per `ReceiveMessage`, from 1 to 10. */
  readonly batchSize?: number;
  /** Long polling in seconds, from 0 to 20. */
  readonly waitTimeSeconds?: number;
  /** Pause in milliseconds after an error in the polling loop. */
  readonly errorDelayMs?: number;
}

/** Validated consumption settings of an SQS queue, with their default values. */
export class SqsConsumerConfig {
  /** Maximum SQS visibility (12 h). */
  static readonly MAX_VISIBILITY_SECONDS = 43_200;
  /** Maximum length of the reason copied to the DLQ. */
  static readonly MAX_ERROR_ATTRIBUTE_LENGTH = 1_024;
  /** Maximum number of messages SQS delivers per batch. */
  static readonly MAX_BATCH_SIZE = 10;
  static readonly DEFAULT_BATCH_SIZE = 10;
  static readonly DEFAULT_WAIT_TIME_SECONDS = 20;
  static readonly DEFAULT_ERROR_DELAY_MS = 1_000;
  private static readonly MAX_WAIT_TIME_SECONDS = 20;
  private static readonly MAX_ERROR_DELAY_MS = 3_600_000;

  readonly batchSize: number;
  readonly waitTimeSeconds: number;
  readonly errorDelayMs: number;

  /** @throws MessagingError `InvalidOptions` when a value is out of its range. */
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
