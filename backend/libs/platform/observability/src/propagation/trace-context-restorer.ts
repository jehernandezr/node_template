import {
  context as otelContext,
  ROOT_CONTEXT,
  trace,
  TraceFlags,
  type Context,
} from '@opentelemetry/api';
import type { Tracing } from '../tracing/tracing.js';
import { TraceContextCodec } from './trace-context-codec.js';

/**
 * Continúa la traza de un `traceparent` de confianza (atributos de un mensaje
 * del bus, paso de saga, job) y entrega el `traceparent` del span activo para
 * propagarlo en mensajes y llamadas salientes.
 */
export class TraceContextRestorer {
  constructor(private readonly tracing: Tracing) {}

  /** Contexto OTel que continúa `traceparent`; si no es válido devuelve `base` (por defecto el contexto raíz). */
  contextFrom(
    traceparent: string | null | undefined,
    base: Context = ROOT_CONTEXT,
  ): Context {
    const parsed = TraceContextCodec.parseTraceparent(traceparent);
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

  /** Corre `fn` dentro del contexto de `contextFrom(traceparent)`. */
  run<T>(traceparent: string | null | undefined, fn: () => T): T {
    return otelContext.with(this.contextFrom(traceparent), fn);
  }

  /** `traceparent` del span activo, o `undefined` si no hay span válido. */
  current(): string | undefined {
    const ids = this.tracing.activeIds();
    return ids === undefined
      ? undefined
      : TraceContextCodec.formatTraceparent(ids);
  }
}
