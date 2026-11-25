import type { Topology } from '@platform/messaging';

/** Direct publishing on SNS and SQS with `SnsSqsMessageBus`. */
export interface AwsMessagingOptions {
  /** Topology of the service, the same one `MessagingModule` receives. */
  readonly topology: Topology;
  /** `source` attribute of the envelopes `SnsSqsMessageBus` publishes. */
  readonly source: string;
}

/** Options of `AwsModule`. */
export interface AwsModuleOptions {
  /**
   * With it the module registers `SnsSqsMessageBus`, which `MessagingModule`
   * receives as `bus`. Without it, it only registers the clients, the names, the
   * error translator and `SnsSqsEnvelopePublisher`.
   */
  readonly messaging?: AwsMessagingOptions;
  /**
   * `true` registers `ElastiCacheIamAuthTokenProvider`, which `ValkeyModule` receives
   * as `authToken`. The region comes from `AWS_REGION`; the user, the cache and whether
   * it is serverless are set by `ValkeyModule` from its configuration. Defaults to `false`.
   */
  readonly elastiCache?: boolean;
}
