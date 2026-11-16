import type { TextMapGetter } from '@opentelemetry/api';
import type { IncomingTraceparentPolicy } from './incoming-traceparent-policy.enum.js';

export interface ExternalTraceparentPropagatorOptions {
  /** Por defecto `IncomingTraceparentPolicy.External`. */
  readonly policy?: IncomingTraceparentPolicy;
  /**
   * Con la política `External`, indica si el portador viene de otro servicio de
   * la plataforma y su traza se debe continuar. Por defecto ningún portador es de confianza.
   */
  readonly isTrusted?: (carrier: unknown, getter: TextMapGetter) => boolean;
}
