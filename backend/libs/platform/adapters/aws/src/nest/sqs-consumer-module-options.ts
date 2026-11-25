import type { Topology } from '@platform/messaging';
import type { SqsConsumerSettings } from '../sqs-consumer-config.js';

/** Options of `SqsConsumerModule`: the queue the service consumes. */
export interface SqsConsumerModuleOptions {
  /** Topology of the service, the same one `MessagingModule` receives. */
  readonly topology: Topology;
  /** Logical name of the queue, declared in the topology. */
  readonly queue: string;
  /** Long polling settings. */
  readonly consumer?: SqsConsumerSettings;
  /** `false` in Lambda, where the service uses `SqsLambdaHandler`. Defaults to `true`. */
  readonly poll?: boolean;
}
