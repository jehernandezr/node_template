import {
  context as otelContext,
  createContextKey,
  type Context,
  type TextMapGetter,
  type TextMapPropagator,
  type TextMapSetter,
} from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { IncomingTraceparentPolicy } from './incoming-traceparent-policy.enum.js';
import type { ExternalTraceparentPropagatorOptions } from './external-traceparent-propagator-options.js';
import { TraceContextCodec } from './trace-context-codec.js';

/**
 * Propagador W3C que no adopta la traza de un cliente externo. Con la política
 * `External`, un `traceparent` válido de un portador no confiable no se
 * continúa: la petición abre una traza nueva (con el trace id UUIDv7 del
 * generador de la plataforma) y el trace id recibido queda en el contexto bajo
 * `EXTERNAL_TRACE_ID_KEY`. La inyección (llamadas salientes) es la de W3C sin cambios.
 */
export class ExternalTraceparentPropagator implements TextMapPropagator {
  /** Llave del contexto OTel donde queda el trace id externo. */
  static readonly EXTERNAL_TRACE_ID_KEY = createContextKey(
    'platform.external_trace_id',
  );

  private readonly w3c = new W3CTraceContextPropagator();
  private readonly policy: IncomingTraceparentPolicy;
  private readonly isTrusted: (
    carrier: unknown,
    getter: TextMapGetter,
  ) => boolean;

  constructor(options: ExternalTraceparentPropagatorOptions = {}) {
    this.policy = options.policy ?? IncomingTraceparentPolicy.External;
    this.isTrusted = options.isTrusted ?? (() => false);
  }

  /** Trace id externo guardado en `context` (por defecto el activo), si lo hay. */
  static externalTraceIdFrom(
    context: Context = otelContext.active(),
  ): string | undefined {
    const value = context.getValue(
      ExternalTraceparentPropagator.EXTERNAL_TRACE_ID_KEY,
    );
    return typeof value === 'string' ? value : undefined;
  }

  inject(context: Context, carrier: unknown, setter: TextMapSetter): void {
    this.w3c.inject(context, carrier, setter);
  }

  extract(context: Context, carrier: unknown, getter: TextMapGetter): Context {
    if (
      this.policy === IncomingTraceparentPolicy.Continue ||
      this.isTrusted(carrier, getter)
    ) {
      return this.w3c.extract(context, carrier, getter);
    }
    const parsed = TraceContextCodec.parseTraceparent(
      ExternalTraceparentPropagator.firstHeader(
        getter.get(carrier, TraceContextCodec.TRACEPARENT_HEADER),
      ),
    );
    return parsed === null
      ? context
      : context.setValue(
          ExternalTraceparentPropagator.EXTERNAL_TRACE_ID_KEY,
          parsed.traceId,
        );
  }

  fields(): string[] {
    return this.w3c.fields();
  }

  private static firstHeader(
    value: string | string[] | undefined,
  ): string | undefined {
    return Array.isArray(value) ? value[0] : value;
  }
}
