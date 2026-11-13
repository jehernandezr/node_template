import {
  context as otelContext,
  createContextKey,
  ROOT_CONTEXT,
  trace,
  TraceFlags,
  type Context,
  type TextMapGetter,
  type TextMapPropagator,
  type TextMapSetter,
} from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { activeSpanIds } from './request-context.js';
import { formatTraceparent, parseTraceparent } from './trace.js';

/** Header W3C que lleva la traza. */
export const TRACEPARENT_HEADER = 'traceparent';

/** Qué hacer con el `traceparent` de una petición entrante. */
export enum IncomingTraceparentPolicy {
  /** Continuar la traza recibida (llamadas internas, mensajes, sagas). */
  Continue = 'continue',
  /**
   * Abrir una traza nueva con un `traceId` UUIDv7 propio y guardar el trace id
   * recibido como `externalTraceId`. Es lo que pide el plan para clientes externos.
   */
  External = 'external',
}

/** Llave del contexto OTel donde queda el trace id externo. */
export const EXTERNAL_TRACE_ID_KEY = createContextKey(
  'platform.external_trace_id',
);

/** Trace id externo guardado por {@link ExternalTraceparentPropagator}, si lo hay. */
export function externalTraceIdFrom(
  ctx: Context = otelContext.active(),
): string | undefined {
  const value = ctx.getValue(EXTERNAL_TRACE_ID_KEY);
  return typeof value === 'string' ? value : undefined;
}

export interface ExternalTraceparentPropagatorOptions {
  /** Por defecto {@link IncomingTraceparentPolicy.External}. */
  readonly policy?: IncomingTraceparentPolicy;
  /**
   * Con la política `External`, indica si el portador viene de otro servicio de
   * la plataforma y su traza se debe continuar (por ejemplo, una llamada de
   * internal-api). Por defecto ningún portador es de confianza.
   */
  readonly isTrusted?: (carrier: unknown, getter: TextMapGetter) => boolean;
}

function firstHeader(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/**
 * Propagador W3C que no adopta la traza de un cliente externo. Con la política
 * `External`, un `traceparent` válido de un portador no confiable no se
 * continúa: la petición abre una traza nueva (con el trace id UUIDv7 del
 * generador de la plataforma) y el trace id recibido queda en el contexto bajo
 * {@link EXTERNAL_TRACE_ID_KEY}. `setupTelemetry` lo agrega como atributo
 * `platform.external_trace_id` del span raíz, y el middleware lo pasa a
 * `RequestContext` como `externalTraceId`.
 *
 * La inyección (llamadas salientes) es la de W3C sin cambios.
 */
export class ExternalTraceparentPropagator implements TextMapPropagator {
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
    const parsed = parseTraceparent(
      firstHeader(getter.get(carrier, TRACEPARENT_HEADER)),
    );
    return parsed === null
      ? context
      : context.setValue(EXTERNAL_TRACE_ID_KEY, parsed.traceId);
  }

  fields(): string[] {
    return this.w3c.fields();
  }
}

/**
 * Contexto OTel que continúa un `traceparent` de confianza (atributos de un
 * mensaje del bus, paso de saga, job). Si el header no es válido devuelve
 * `base` sin cambios. Úsalo con `context.with(ctx, fn)`.
 */
export function contextFromTraceparent(
  traceparent: string | null | undefined,
  base: Context = ROOT_CONTEXT,
): Context {
  const parsed = parseTraceparent(traceparent);
  if (parsed === null) {
    return base;
  }
  return trace.setSpanContext(base, {
    traceId: parsed.traceId,
    spanId: parsed.spanId,
    traceFlags: parsed.sampled ? TraceFlags.SAMPLED : TraceFlags.NONE,
    isRemote: true,
  });
}

/** `traceparent` del span activo, para propagarlo en mensajes y llamadas salientes. */
export function currentTraceparent(): string | undefined {
  const span = activeSpanIds();
  return span === undefined ? undefined : formatTraceparent(span);
}
