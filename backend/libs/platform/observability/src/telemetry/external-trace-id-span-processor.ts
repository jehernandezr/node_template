import { trace, type Context } from '@opentelemetry/api';
import type { Span, SpanProcessor } from '@opentelemetry/sdk-trace';
import { ExternalTraceparentPropagator } from '../propagation/external-traceparent-propagator.js';
import { SpanAttribute } from '../tracing/span-attribute.enum.js';

/**
 * Agrega `platform.external_trace_id` al span raíz cuando la petición traía
 * un `traceparent` externo que no se continuó.
 */
export class ExternalTraceIdSpanProcessor implements SpanProcessor {
  onStart(span: Span, parentContext: Context): void {
    if (trace.getSpanContext(parentContext) !== undefined) {
      return;
    }
    const externalTraceId =
      ExternalTraceparentPropagator.externalTraceIdFrom(parentContext);
    if (externalTraceId !== undefined) {
      span.setAttribute(SpanAttribute.ExternalTraceId, externalTraceId);
    }
  }

  onEnd(): void {
    // Sin efecto: solo marca spans al iniciar.
  }

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}
