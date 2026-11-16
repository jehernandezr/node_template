import type { Type } from '@nestjs/common';
import type { ConfigEnv } from '@platform/config';
import type { EnvelopePublisher } from '@platform/messaging';
import type { TelemetryHandle } from '@platform/observability';
import type { SchedulingMode } from '@platform/scheduling';

/** Qué adaptadores de infraestructura se registran. */
export interface RuntimeAdapters {
  /** Valkey para caché, límite de tasa, ruteo, canal del directorio, Bloom y lock de jobs. Sin él, modo local en memoria. */
  readonly valkey: boolean;
  /** AWS para publicar en SNS y consumir de SQS. Sin él, el outbox no se publica salvo que se pase `publisher`. */
  readonly aws: boolean;
}

/** Opciones de `PlatformRuntimeModule.forService`. */
export interface PlatformRuntimeOptions {
  /** Entorno que valida `ConfigModule`. */
  readonly env: ConfigEnv;
  /** Telemetría ya arrancada en `instrumentation.ts`. Sin valor, `ObservabilityModule` arranca una. */
  readonly telemetry?: TelemetryHandle;
  /** Lo que no se indique se deduce del entorno con `RuntimeAdapterSelector`. */
  readonly adapters?: Partial<RuntimeAdapters>;
  /**
   * Publicador del relay del outbox. Por defecto `SnsSqsEnvelopePublisher` cuando `adapters.aws`
   * es `true`; sin ninguno de los dos, el relay no se registra.
   */
  readonly publisher?: Type<EnvelopePublisher>;
  /** Por defecto `SchedulingMode.InProcess`. */
  readonly schedulingMode?: SchedulingMode;
}
