import {
  FixedRandomSource,
  SequentialIdGenerator,
} from '@platform/kernel/test-utils';
import { TraceContextCodec } from '../../propagation/trace-context-codec.js';
import { UuidV7TraceIdGenerator } from '../uuid-v7-trace-id-generator.js';

describe('UuidV7TraceIdGenerator', () => {
  const generator = () =>
    new UuidV7TraceIdGenerator(
      new TraceContextCodec(
        new SequentialIdGenerator(),
        new FixedRandomSource([0.5], 0xab),
      ),
    );

  it('uses the UUIDv7 without dashes as the 32 hex trace id', () => {
    const expected = new SequentialIdGenerator()
      .next()
      .toString()
      .replace(/-/g, '');

    expect(generator().generateTraceId()).toBe(expected);
    expect(generator().generateTraceId()).toMatch(/^[0-9a-f]{32}$/);
  });

  it('generates the span id from the random source', () => {
    expect(generator().generateSpanId()).toBe('abababababababab');
  });
});
