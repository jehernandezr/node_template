import {
  InMemorySpanExporter,
  SimpleSpanProcessor,
  TracerProvider,
} from '@opentelemetry/sdk-trace';
import { IovalkeyInstrumentation } from '../iovalkey-instrumentation.js';
import { FakeValkey } from './utils/fake-valkey.js';

describe('IovalkeyInstrumentation', () => {
  it('hooks the iovalkey module and traces each command by name only', async () => {
    const spans = new InMemorySpanExporter();
    const instrumentation = new IovalkeyInstrumentation({
      requireParentSpan: false,
      dbStatementSerializer: (command) => command,
    });
    instrumentation.setTracerProvider(
      new TracerProvider({
        spanProcessors: [new SimpleSpanProcessor({ exporter: spans })],
      }),
    );
    try {
      const [definition] = instrumentation.getModuleDefinitions();
      expect(definition?.name).toBe('iovalkey');
      definition?.patch?.(FakeValkey, '0.4.0');

      new FakeValkey().sendCommand({
        name: 'get',
        args: ['identity:secret-key'],
        resolve: () => undefined,
        reject: () => undefined,
      });
      await Promise.resolve();

      const [command] = spans.getFinishedSpans();
      expect(command?.name).toBe('get');
      expect(JSON.stringify(command?.attributes)).not.toContain('secret-key');
    } finally {
      instrumentation.disable();
    }
  });

  it('declares the iovalkey versions it supports', () => {
    expect(IovalkeyInstrumentation.SUPPORTED_VERSIONS).toEqual(['>=0.1.0 <1']);
  });
});
