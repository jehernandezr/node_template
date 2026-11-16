import type { Topology } from '@platform/messaging';

/** Publicación directa sobre SNS y SQS con `SnsSqsMessageBus`. */
export interface AwsMessagingOptions {
  /** Topología del servicio, la misma que recibe `MessagingModule`. */
  readonly topology: Topology;
  /** Atributo `source` de los sobres que publica `SnsSqsMessageBus`. */
  readonly source: string;
}

/** Opciones de `AwsModule`. */
export interface AwsModuleOptions {
  /**
   * Con ella el módulo registra `SnsSqsMessageBus`, que `MessagingModule`
   * recibe como `bus`. Sin ella solo registra los clientes, los nombres, el
   * traductor de errores y `SnsSqsEnvelopePublisher`.
   */
  readonly messaging?: AwsMessagingOptions;
  /**
   * `true` registra `ElastiCacheIamAuthTokenProvider`, que `ValkeyModule` recibe
   * como `authToken`. La región sale de `AWS_REGION`; el usuario, la caché y si
   * es serverless los pone `ValkeyModule` desde su configuración. Por defecto `false`.
   */
  readonly elastiCache?: boolean;
}
