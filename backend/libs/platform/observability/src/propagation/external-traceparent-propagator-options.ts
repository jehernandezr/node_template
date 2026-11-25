import type { TextMapGetter } from '@opentelemetry/api';
import type { IncomingTraceparentPolicy } from './incoming-traceparent-policy.enum.js';

export interface ExternalTraceparentPropagatorOptions {
  /** Defaults to `IncomingTraceparentPolicy.External`. */
  readonly policy?: IncomingTraceparentPolicy;
  /**
   * With the `External` policy, tells whether the carrier comes from another platform
   * service and its trace must be continued. By default no carrier is trusted.
   */
  readonly isTrusted?: (carrier: unknown, getter: TextMapGetter) => boolean;
}
