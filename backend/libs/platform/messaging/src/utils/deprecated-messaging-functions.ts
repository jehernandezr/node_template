import { SystemClock, UuidV7IdGenerator } from '@platform/kernel';
import type { Clock, IdGenerator } from '@platform/kernel';
import { ProcessedMessageKey } from '../dispatch/processed-message-key.js';
import type { CreateEnvelopeInput } from '../envelope/create-envelope-input.js';
import { EnvelopeFactory } from '../envelope/envelope-factory.js';
import type { MessageEnvelope } from '../envelope/message-envelope.js';

/** Fuentes de id y de hora de {@link createEnvelope}. */
export interface CreateEnvelopeOptions {
  readonly ids?: IdGenerator;
  readonly clock?: Clock;
  /** @deprecated Usa `ids`. */
  readonly newId?: () => string;
  /** @deprecated Usa `clock`. */
  readonly now?: () => Date;
}

/**
 * Transitorio: las pruebas de los adaptadores todavía lo importan de aquí.
 * @deprecated Usa `EnvelopeFactory`.
 */
export function createEnvelope<T>(
  input: CreateEnvelopeInput<T>,
  options: CreateEnvelopeOptions = {},
): MessageEnvelope<T> {
  const clock = options.clock ?? new SystemClock();
  const envelope = new EnvelopeFactory(
    clock,
    options.ids ?? new UuidV7IdGenerator(clock),
  ).create(input);
  return {
    ...envelope,
    ...(options.newId ? { id: options.newId() } : {}),
    ...(options.now ? { time: options.now().toISOString() } : {}),
  };
}

/**
 * Transitorio: las pruebas de los adaptadores todavía lo importan de aquí.
 * @deprecated Usa `ProcessedMessageKey.of`.
 */
export function processedMessageKey(consumer: string, id: string): string {
  return ProcessedMessageKey.of(consumer, id);
}
