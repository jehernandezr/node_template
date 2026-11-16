import { EnvelopeBuilder } from '../../__tests__/utils/index.js';
import { EnvelopeLimits } from '../envelope-limits.js';
import { EnvelopeValidator } from '../envelope-validator.js';
import { MessagingErrorCode } from '../../errors/messaging-error-code.enum.js';

const traceparent = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';

function validator(): EnvelopeValidator {
  return new EnvelopeValidator();
}

describe('EnvelopeValidator', () => {
  describe('when it validates an envelope', () => {
    it('accepts a valid envelope', () => {
      expect(validator().validate(EnvelopeBuilder.anEnvelope())).toEqual(
        EnvelopeBuilder.anEnvelope(),
      );
    });

    it('keeps the CloudEvents extension attributes', () => {
      const parsed = validator().validate({
        ...EnvelopeBuilder.anEnvelope(),
        partitionkey: 'tenant-7',
        sequence: 3,
      });

      expect(parsed).toMatchObject({ partitionkey: 'tenant-7', sequence: 3 });
    });

    it('accepts a W3C traceparent', () => {
      expect(
        validator().validate(EnvelopeBuilder.anEnvelope({ traceparent })),
      ).toMatchObject({ traceparent });
    });

    it.each([
      ['a traceparent that is not W3C', 'not-a-traceparent'],
      [
        'a traceparent with a short trace id',
        '00-0af7651916cd43dd-b7ad6b7169203331-01',
      ],
    ])('rejects %s', (_label, value) => {
      expect(() =>
        validator().validate(
          EnvelopeBuilder.anEnvelope({ traceparent: value }),
        ),
      ).toThrow(
        expect.objectContaining({ code: MessagingErrorCode.InvalidEnvelope }),
      );
    });

    it.each([
      ['an id', { id: 'x'.repeat(EnvelopeLimits.MAX_ID_LENGTH + 1) }],
      ['a type', { type: 'x'.repeat(EnvelopeLimits.MAX_TYPE_LENGTH + 1) }],
      [
        'a source',
        { source: 'x'.repeat(EnvelopeLimits.MAX_SOURCE_LENGTH + 1) },
      ],
      [
        'a subject',
        { subject: 'x'.repeat(EnvelopeLimits.MAX_SUBJECT_LENGTH + 1) },
      ],
      [
        'a tenant',
        { tenantid: 'x'.repeat(EnvelopeLimits.MAX_TENANT_ID_LENGTH + 1) },
      ],
      [
        'an actor',
        { actorid: 'x'.repeat(EnvelopeLimits.MAX_ACTOR_ID_LENGTH + 1) },
      ],
    ])('rejects %s longer than its limit', (_label, overrides) => {
      expect(() =>
        validator().validate(EnvelopeBuilder.anEnvelope(overrides)),
      ).toThrow(
        expect.objectContaining({ code: MessagingErrorCode.InvalidEnvelope }),
      );
    });

    it.each([
      ['an id', { id: 'x'.repeat(EnvelopeLimits.MAX_ID_LENGTH) }],
      ['a type', { type: 'x'.repeat(EnvelopeLimits.MAX_TYPE_LENGTH) }],
      ['a source', { source: 'x'.repeat(EnvelopeLimits.MAX_SOURCE_LENGTH) }],
      ['a subject', { subject: 'x'.repeat(EnvelopeLimits.MAX_SUBJECT_LENGTH) }],
      [
        'a tenant',
        { tenantid: 'x'.repeat(EnvelopeLimits.MAX_TENANT_ID_LENGTH) },
      ],
      ['an actor', { actorid: 'x'.repeat(EnvelopeLimits.MAX_ACTOR_ID_LENGTH) }],
    ])('accepts %s exactly at its limit', (_label, overrides) => {
      expect(
        validator().validate(EnvelopeBuilder.anEnvelope(overrides)),
      ).toMatchObject(overrides);
    });

    it.each([
      ['a wrong specversion', { specversion: '0.3' }],
      ['an empty type', { type: '' }],
      ['a non-JSON datacontenttype', { datacontenttype: 'text/plain' }],
      ['an invalid time', { time: 'yesterday' }],
    ])('rejects %s', (_label, overrides) => {
      expect(() =>
        validator().validate({ ...EnvelopeBuilder.anEnvelope(), ...overrides }),
      ).toThrow(
        expect.objectContaining({ code: MessagingErrorCode.InvalidEnvelope }),
      );
    });
  });

  describe('when it builds the wire form', () => {
    it('returns the JSON round-trip of the envelope, without undefined attributes', () => {
      const envelope = EnvelopeBuilder.anEnvelope({
        data: { at: new Date('2026-01-01T00:00:00.000Z'), skipped: undefined },
      });

      const wire = validator().toWire(envelope);

      expect(wire).toEqual(JSON.parse(JSON.stringify(envelope)));
      expect(wire.data).toEqual({ at: '2026-01-01T00:00:00.000Z' });
      expect(wire.data).not.toHaveProperty('skipped');
    });

    it('rejects an envelope that does not validate', () => {
      expect(() =>
        validator().toWire(EnvelopeBuilder.anEnvelope({ id: '' })),
      ).toThrow(
        expect.objectContaining({ code: MessagingErrorCode.InvalidEnvelope }),
      );
    });

    it('rejects an envelope over the size limit', () => {
      expect(() =>
        validator().toWire(
          EnvelopeBuilder.anEnvelope({
            data: { pad: 'x'.repeat(EnvelopeLimits.MAX_BYTES) },
          }),
        ),
      ).toThrow(
        expect.objectContaining({ code: MessagingErrorCode.PayloadTooLarge }),
      );
    });
  });

  describe('when it checks the size', () => {
    it('accepts a size exactly at the limit', () => {
      expect(() =>
        validator().assertSize(EnvelopeLimits.MAX_BYTES),
      ).not.toThrow();
    });

    it('rejects a size above the limit with PayloadTooLarge', () => {
      expect(() =>
        validator().assertSize(EnvelopeLimits.MAX_BYTES + 1),
      ).toThrow(
        expect.objectContaining({ code: MessagingErrorCode.PayloadTooLarge }),
      );
    });

    it('rejects a missing size with PayloadTooLarge', () => {
      expect(() => validator().assertSize()).toThrow(
        expect.objectContaining({ code: MessagingErrorCode.PayloadTooLarge }),
      );
    });

    it('measures a value in bytes of its JSON encoding', () => {
      expect(validator().sizeBytes({ a: 'é' })).toBe(
        Buffer.byteLength(JSON.stringify({ a: 'é' })),
      );
    });

    it('measures a text in bytes of its UTF-8 encoding', () => {
      expect(validator().textBytes('é')).toBe(2);
      expect(validator().textBytes('a')).toBe(1);
    });
  });
});
