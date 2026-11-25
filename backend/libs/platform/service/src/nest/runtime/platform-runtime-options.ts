import type { Type } from '@nestjs/common';
import type { ConfigEnv } from '@platform/config';
import type { EnvelopePublisher } from '@platform/messaging';
import type { TelemetryHandle } from '@platform/observability';
import type { SchedulingMode } from '@platform/scheduling';

/** Which infrastructure adapters are registered. */
export interface RuntimeAdapters {
  /** Valkey for cache, rate limiting, routing, directory channel, Bloom and job lock. Without it, in-memory local mode. */
  readonly valkey: boolean;
  /** AWS to publish to SNS and consume from SQS. Without it, the outbox is not published unless `publisher` is passed. */
  readonly aws: boolean;
}

/** Options of `PlatformRuntimeModule.forService`. */
export interface PlatformRuntimeOptions {
  /** Environment that `ConfigModule` validates. */
  readonly env: ConfigEnv;
  /** Telemetry already started in `instrumentation.ts`. Without a value, `ObservabilityModule` starts one. */
  readonly telemetry?: TelemetryHandle;
  /** Whatever is not specified is inferred from the environment with `RuntimeAdapterSelector`. */
  readonly adapters?: Partial<RuntimeAdapters>;
  /**
   * Publisher of the outbox relay. `SnsSqsEnvelopePublisher` by default when `adapters.aws`
   * is `true`; with neither of the two, the relay is not registered.
   */
  readonly publisher?: Type<EnvelopePublisher>;
  /** `SchedulingMode.InProcess` by default. */
  readonly schedulingMode?: SchedulingMode;
}
