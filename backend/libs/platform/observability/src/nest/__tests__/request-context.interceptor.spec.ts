import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { context, trace, TraceFlags } from '@opentelemetry/api';
import { StackContextManager } from '@opentelemetry/sdk-trace';
import { firstValueFrom } from 'rxjs';
import {
  FixedRandomSource,
  SequentialIdGenerator,
} from '@platform/kernel/test-utils';
import type { RequestContextData } from '../../context/request-context-data.js';
import { RequestContextStore } from '../../context/request-context-store.js';
import { DebugSampler } from '../../logging/debug-sampler.js';
import { Redactor } from '../../redaction/redactor.js';
import { TraceContextCodec } from '../../propagation/trace-context-codec.js';
import { Tracing } from '../../tracing/tracing.js';
import { RequestContextInterceptor } from '../request-context.interceptor.js';
import { RecordingCallHandler } from './utils/recording-call-handler.js';

describe('RequestContextInterceptor', () => {
  const store = new RequestContextStore(new Tracing(new Redactor()));
  const interceptor = new RequestContextInterceptor(
    store,
    new TraceContextCodec(
      new SequentialIdGenerator(),
      new FixedRandomSource([0.5], 0xab),
    ),
    new DebugSampler(0, new FixedRandomSource()),
  );
  // El interceptor no lee el contexto de ejecución de Nest.
  const executionContext = {} as ExecutionContext;

  it('opens a new request context for the handler when there is none', async () => {
    const handler: CallHandler = new RecordingCallHandler(store);

    const seen = (await firstValueFrom(
      interceptor.intercept(executionContext, handler),
    )) as RequestContextData | undefined;

    expect(seen?.traceId).toMatch(/^[0-9a-f]{32}$/);
  });

  it('opens a request context inside an active span that has none', async () => {
    const manager = new StackContextManager();
    context.setGlobalContextManager(manager.enable());
    const sampling = new RequestContextInterceptor(
      store,
      new TraceContextCodec(
        new SequentialIdGenerator(),
        new FixedRandomSource([0.5], 0xab),
      ),
      new DebugSampler(1, new FixedRandomSource()),
    );
    const span = trace.wrapSpanContext({
      traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
      spanId: '00f067aa0ba902b7',
      traceFlags: TraceFlags.SAMPLED,
    });

    try {
      const seen = (await context.with(
        trace.setSpan(context.active(), span),
        () =>
          firstValueFrom(
            sampling.intercept(
              executionContext,
              new RecordingCallHandler(store),
            ),
          ),
      )) as RequestContextData | undefined;

      expect(seen).toMatchObject({
        traceId: '4bf92f3577b34da6a3ce929d0e0e4736',
        debugSampled: true,
      });
    } finally {
      context.disable();
    }
  });

  it('keeps the request context that is already active', async () => {
    const handler: CallHandler = new RecordingCallHandler(store);

    await store.run({ tenantId: 'tenant-b', debugSampled: false }, async () => {
      const outer = store.current();

      const seen = (await firstValueFrom(
        interceptor.intercept(executionContext, handler),
      )) as RequestContextData | undefined;

      expect(seen).toBe(outer);
    });
  });
});
