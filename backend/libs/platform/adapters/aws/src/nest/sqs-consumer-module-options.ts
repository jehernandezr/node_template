import type { Topology } from '@platform/messaging';
import type { SqsConsumerSettings } from '../sqs-consumer-config.js';

/** Opciones de `SqsConsumerModule`: la cola que consume el servicio. */
export interface SqsConsumerModuleOptions {
  /** Topología del servicio, la misma que recibe `MessagingModule`. */
  readonly topology: Topology;
  /** Nombre lógico de la cola, declarada en la topología. */
  readonly queue: string;
  /** Ajustes del long polling. */
  readonly consumer?: SqsConsumerSettings;
  /** `false` en Lambda, donde el servicio usa `SqsLambdaHandler`. Por defecto `true`. */
  readonly poll?: boolean;
}
