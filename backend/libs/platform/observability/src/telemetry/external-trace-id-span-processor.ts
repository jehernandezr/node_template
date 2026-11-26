import { trace, type Context } from '@opentelemetry/api';
import type { Span, SpanProcessor } from '@opentelemetry/sdk-trace';
import { ExternalTraceparentPropagator } from '../propagation/external-traceparent-propagator.js';
import { SpanAttribute } from '../tracing/span-attribute.enum.js';

/**
 * Adds `platform.external_trace_id` to the root span when the request carried
 * an external `traceparent` that was not continued.
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

  /** Does nothing: the processor only marks spans on start. */
  // eslint-disable-next-line @typescript-eslint/no-empty-function -- SpanProcessor requires onEnd and there is nothing to do at the end of a span
  onEnd(): void {}

  forceFlush(): Promise<void> {
    return Promise.resolve();
  }

  shutdown(): Promise<void> {
    return Promise.resolve();
  }
}
