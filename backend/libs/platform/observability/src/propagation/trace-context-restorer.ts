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
 * Continues the trace of a trusted `traceparent` (bus message attributes, saga
 * step, job) and provides the `traceparent` of the active span to propagate it
 * in outgoing messages and calls.
 */
export class TraceContextRestorer {
  constructor(private readonly tracing: Tracing) {}

  /** Returns the OTel context that continues `traceparent`; if invalid, returns `base` (the root context by default). */
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

  /** Runs `fn` inside the context of `contextFrom(traceparent)`. */
  run<T>(traceparent: string | null | undefined, fn: () => T): T {
    return otelContext.with(this.contextFrom(traceparent), fn);
  }

  /** Returns the `traceparent` of the active span, or `undefined` if there is no valid span. */
  current(): string | undefined {
    const ids = this.tracing.activeIds();
    return ids === undefined
      ? undefined
      : TraceContextCodec.formatTraceparent(ids);
  }
}
