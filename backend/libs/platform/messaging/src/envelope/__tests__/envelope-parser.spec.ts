import { EnvelopeBuilder } from '../../__tests__/utils/index.js';
import { EnvelopeLimits } from '../envelope-limits.js';
import { EnvelopeParser } from '../envelope-parser.js';
import { EnvelopeValidator } from '../envelope-validator.js';
import { MessagingErrorCode } from '../../errors/messaging-error-code.enum.js';

const oversizedData = 'x'.repeat(EnvelopeLimits.MAX_BYTES);

function parser(): EnvelopeParser {
  return new EnvelopeParser(new EnvelopeValidator());
}

describe('EnvelopeParser', () => {
  it('parses a JSON text into a validated envelope', () => {
    const envelope = EnvelopeBuilder.anEnvelope({ data: { id: 't1' } });

    expect(parser().parse(JSON.stringify(envelope))).toEqual(envelope);
  });

  it('accepts an already decoded value', () => {
    const envelope = EnvelopeBuilder.anEnvelope({ data: { id: 't1' } });

    expect(parser().parse(envelope)).toEqual(envelope);
  });

  it.each([
    [
      'an oversized decoded value',
      (): unknown => ({
        ...EnvelopeBuilder.anEnvelope(),
        id: '',
        data: oversizedData,
      }),
    ],
    [
      'an oversized JSON text',
      (): unknown =>
        JSON.stringify({
          ...EnvelopeBuilder.anEnvelope(),
          id: '',
          data: oversizedData,
        }),
    ],
  ])(
    'reports PayloadTooLarge for %s even when it is also invalid',
    (_label, raw) => {
      expect(() => parser().parse(raw())).toThrow(
        expect.objectContaining({
          code: MessagingErrorCode.PayloadTooLarge,
        }),
      );
    },
  );

  it('reports InvalidEnvelope for a text that is not JSON', () => {
    expect(() => parser().parse('{not json')).toThrow(
      expect.objectContaining({ code: MessagingErrorCode.InvalidEnvelope }),
    );
  });

  it('reports InvalidEnvelope for a value that cannot be serialized', () => {
    const cyclic: Record<string, unknown> = { ...EnvelopeBuilder.anEnvelope() };
    cyclic['self'] = cyclic;

    expect(() => parser().parse(cyclic)).toThrow(
      expect.objectContaining({ code: MessagingErrorCode.InvalidEnvelope }),
    );
  });

  it('reports InvalidEnvelope for an envelope that breaks the schema', () => {
    expect(() =>
      parser().parse(EnvelopeBuilder.anEnvelope({ id: '' })),
    ).toThrow(
      expect.objectContaining({ code: MessagingErrorCode.InvalidEnvelope }),
    );
  });
});
