import {
  defaultTextMapGetter,
  ROOT_CONTEXT,
  trace,
  TraceFlags,
  type Context,
} from '@opentelemetry/api';
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
  TracerProvider,
  type ReadableSpan,
} from '@opentelemetry/sdk-trace';
import { ExternalTraceparentPropagator } from '../../propagation/external-traceparent-propagator.js';
import { SpanAttribute } from '../../tracing/span-attribute.enum.js';
import { ExternalTraceIdSpanProcessor } from '../external-trace-id-span-processor.js';

const EXTERNAL_TRACE = '4bf92f3577b34da6a3ce929d0e0e4736';
const LOCAL_SPAN = {
  traceId: '0af7651916cd43dd8448eb211c80319c',
  spanId: '00f067aa0ba902b7',
  traceFlags: TraceFlags.SAMPLED,
  isRemote: false,
};

function externalContext(): Context {
  return new ExternalTraceparentPropagator().extract(
    ROOT_CONTEXT,
    { traceparent: `00-${EXTERNAL_TRACE}-00f067aa0ba902b7-01` },
    defaultTextMapGetter,
  );
}

/** Abre y cierra un span bajo `parent` con el procesador registrado y devuelve lo exportado. */
async function spanStartedIn(parent: Context): Promise<ReadableSpan> {
  const exporter = new InMemorySpanExporter();
  const provider = new TracerProvider({
    spanProcessors: [
      new ExternalTraceIdSpanProcessor(),
      new SimpleSpanProcessor({ exporter }),
    ],
  });
  provider.getTracer('test').startSpan('operation', {}, parent).end();
  await provider.forceFlush();
  const [span] = exporter.getFinishedSpans();
  await provider.shutdown();
  if (span === undefined) {
    throw new Error('the span was not exported');
  }
  return span;
}

describe('ExternalTraceIdSpanProcessor', () => {
  it('adds the external trace id to a root span', async () => {
    const span = await spanStartedIn(externalContext());

    expect(span.attributes[SpanAttribute.ExternalTraceId]).toBe(EXTERNAL_TRACE);
  });

  it('does not add the attribute to a span that has a parent', async () => {
    const withParent = trace.setSpanContext(externalContext(), LOCAL_SPAN);

    const span = await spanStartedIn(withParent);

    expect(span.attributes).not.toHaveProperty(SpanAttribute.ExternalTraceId);
  });

  it('does not add the attribute when there is no external trace id', async () => {
    const span = await spanStartedIn(ROOT_CONTEXT);

    expect(span.attributes).not.toHaveProperty(SpanAttribute.ExternalTraceId);
  });

  it('resolves flushes and shutdown without effect', async () => {
    const processor = new ExternalTraceIdSpanProcessor();

    await expect(processor.forceFlush()).resolves.toBeUndefined();
    await expect(processor.shutdown()).resolves.toBeUndefined();
    expect(() => processor.onEnd()).not.toThrow();
  });
});
