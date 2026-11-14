import { context, SpanKind, SpanStatusCode } from '@opentelemetry/api';
import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
  StackContextManager,
  TracerProvider,
} from '@opentelemetry/sdk-trace';
import { PlatformError } from '@platform/kernel';
import { Redactor } from '../../redaction/redactor.js';
import { SpanAttribute } from '../span-attribute.enum.js';
import { Tracing } from '../tracing.js';

class PaymentDeclinedError extends PlatformError {
  readonly code = 'BILLING.PAYMENT.DECLINED';
}

class TransientNetworkError extends Error {
  readonly code = 'ECONNRESET';
}

describe('Tracing', () => {
  const exporter = new InMemorySpanExporter();
  const provider = new TracerProvider({
    spanProcessors: [new SimpleSpanProcessor({ exporter })],
  });
  const tracing = new Tracing(new Redactor(), provider.getTracer('test'));

  beforeAll(() => {
    context.setGlobalContextManager(new StackContextManager().enable());
  });

  afterAll(async () => {
    context.disable();
    await provider.shutdown();
  });

  beforeEach(() => {
    exporter.reset();
  });

  describe('withSpan', () => {
    it('returns the value of fn and leaves an ended span with the name, INTERNAL kind and attributes', async () => {
      const result = await tracing.withSpan('users.sign_in', () => 'ok', {
        attributes: { 'tenant.kind': 'retail' },
      });

      const [span] = exporter.getFinishedSpans();
      expect(result).toBe('ok');
      expect(span).toMatchObject({
        name: 'users.sign_in',
        kind: SpanKind.INTERNAL,
        attributes: { 'tenant.kind': 'retail' },
      });
    });

    it('uses the kind given in the options', async () => {
      await tracing.withSpan('consumer.handle', () => undefined, {
        kind: SpanKind.CONSUMER,
      });

      expect(exporter.getFinishedSpans()[0]?.kind).toBe(SpanKind.CONSUMER);
    });

    it('marks the span as failed, rethrows and keeps the code without the URL credentials', async () => {
      await expect(
        tracing.withSpan('billing.charge', () => {
          throw new PaymentDeclinedError('declined for https://u:p@psp/x');
        }),
      ).rejects.toMatchObject({ code: 'BILLING.PAYMENT.DECLINED' });

      const [span] = exporter.getFinishedSpans();
      expect(span?.status).toEqual({
        code: SpanStatusCode.ERROR,
        message: 'BILLING.PAYMENT.DECLINED',
      });
      expect(span?.attributes).toMatchObject({
        [SpanAttribute.ErrorType]: 'BILLING.PAYMENT.DECLINED',
        [SpanAttribute.ErrorCode]: 'BILLING.PAYMENT.DECLINED',
      });
      const exception = span?.events.find(
        (event) => event.name === 'exception',
      );
      expect(JSON.stringify(exception?.attributes)).not.toContain('u:p@');
    });

    it('uses the error name as error.type when the code is not a platform code', async () => {
      await expect(
        tracing.withSpan('payments.connect', () => {
          throw new TransientNetworkError('socket reset');
        }),
      ).rejects.toMatchObject({ code: 'ECONNRESET' });

      const [span] = exporter.getFinishedSpans();
      expect(span?.attributes[SpanAttribute.ErrorType]).toBe('Error');
      expect(span?.attributes).not.toHaveProperty(SpanAttribute.ErrorCode);
    });

    it('uses string as error.type when a non-Error value is thrown', async () => {
      const thrown: unknown = 'boom';

      await expect(
        tracing.withSpan('jobs.run', () => {
          throw thrown;
        }),
      ).rejects.toBe('boom');

      const [span] = exporter.getFinishedSpans();
      expect(span?.attributes[SpanAttribute.ErrorType]).toBe('string');
    });
  });

  describe('activeIds', () => {
    it('is undefined outside a span', () => {
      expect(tracing.activeIds()).toBeUndefined();
    });

    it('returns the ids and sampled flag of the active span', async () => {
      const { active, spanContext } = await tracing.withSpan(
        'orders.create',
        (span) => ({
          active: tracing.activeIds(),
          spanContext: span.spanContext(),
        }),
      );

      expect(active).toEqual({
        traceId: spanContext.traceId,
        spanId: spanContext.spanId,
        sampled: true,
      });
    });
  });
});
