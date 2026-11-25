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
 * W3C propagator that does not adopt the trace of an external client. With the
 * `External` policy, a valid `traceparent` from an untrusted carrier is not
 * continued: the request opens a new trace (with the UUIDv7 trace id of the
 * platform generator) and the received trace id stays in the context under
 * `EXTERNAL_TRACE_ID_KEY`. Injection (outgoing calls) is unchanged W3C.
 */
export class ExternalTraceparentPropagator implements TextMapPropagator {
  /** OTel context key that holds the external trace id. */
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

  /** External trace id stored in `context` (the active one by default), if any. */
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
