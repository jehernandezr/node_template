import { MessagingErrorCode } from '../errors/messaging-error.js';
import {
  MAX_ENVELOPE_BYTES,
  MAX_ENVELOPE_ID_LENGTH,
  createEnvelope,
  envelopeSizeBytes,
  messageEnvelopeSchema,
  toWireEnvelope,
} from './message-envelope.js';

const fixedNow = new Date('2026-01-02T03:04:05.000Z');
const traceparent = '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01';

describe('createEnvelope', () => {
  it('builds a CloudEvents 1.0 envelope with injected id and time', () => {
    const envelope = createEnvelope(
      {
        type: 'tasks.task.updated.v1',
        source: '/services/tasks',
        data: { id: 't1' },
      },
      { newId: () => 'id-1', now: () => fixedNow },
    );

    expect(envelope).toEqual({
      specversion: '1.0',
      id: 'id-1',
      type: 'tasks.task.updated.v1',
      source: '/services/tasks',
      time: '2026-01-02T03:04:05.000Z',
      datacontenttype: 'application/json',
      data: { id: 't1' },
    });
  });

  it('maps optional attributes and omits them when absent', () => {
    const withAll = createEnvelope(
      {
        type: 't',
        source: 's',
        data: null,
        subject: 'task-1',
        traceparent,
        tenantId: 'tenant-1',
        actorId: 'actor-1',
      },
      { newId: () => 'id', now: () => fixedNow },
    );
    expect(withAll).toMatchObject({
      subject: 'task-1',
      traceparent,
      tenantid: 'tenant-1',
      actorid: 'actor-1',
    });

    const bare = createEnvelope(
      { type: 't', source: 's', data: null },
      { newId: () => 'id', now: () => fixedNow },
    );
    expect(Object.keys(bare)).toEqual([
      'specversion',
      'id',
      'type',
      'source',
      'time',
      'datacontenttype',
      'data',
    ]);
  });

  it('generates UUID v7 ids by default', () => {
    const envelope = createEnvelope({ type: 't', source: 's', data: 1 });
    expect(envelope.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });
});

describe('messageEnvelopeSchema', () => {
  const valid = {
    specversion: '1.0',
    id: 'id-1',
    type: 't',
    source: 's',
    time: '2026-01-02T03:04:05.000Z',
    datacontenttype: 'application/json',
    data: { a: 1 },
  };

  it('accepts a valid envelope', () => {
    expect(messageEnvelopeSchema.safeParse(valid).success).toBe(true);
  });

  it('keeps CloudEvents extension attributes', () => {
    const parsed = messageEnvelopeSchema.parse({
      ...valid,
      partitionkey: 'tenant-7',
      sequence: 3,
    });
    expect(parsed).toMatchObject({ partitionkey: 'tenant-7', sequence: 3 });
  });

  it('accepts a W3C traceparent and rejects a malformed one', () => {
    expect(
      messageEnvelopeSchema.safeParse({ ...valid, traceparent }).success,
    ).toBe(true);
    expect(
      messageEnvelopeSchema.safeParse({
        ...valid,
        traceparent: 'not-a-traceparent',
      }).success,
    ).toBe(false);
  });

  it('accepts ids up to 128 characters and rejects longer ones', () => {
    expect(
      messageEnvelopeSchema.safeParse({
        ...valid,
        id: 'x'.repeat(MAX_ENVELOPE_ID_LENGTH),
      }).success,
    ).toBe(true);
    expect(
      messageEnvelopeSchema.safeParse({
        ...valid,
        id: 'x'.repeat(MAX_ENVELOPE_ID_LENGTH + 1),
      }).success,
    ).toBe(false);
  });

  it.each([
    ['wrong specversion', { ...valid, specversion: '0.3' }],
    ['missing id', { ...valid, id: undefined }],
    ['empty type', { ...valid, type: '' }],
    ['non-JSON datacontenttype', { ...valid, datacontenttype: 'text/plain' }],
    ['invalid time', { ...valid, time: 'yesterday' }],
  ])('rejects %s', (_label, candidate) => {
    expect(messageEnvelopeSchema.safeParse(candidate).success).toBe(false);
  });
});

describe('toWireEnvelope', () => {
  it('returns the JSON round-trip of the envelope', () => {
    const envelope = createEnvelope(
      {
        type: 't',
        source: 's',
        data: { at: new Date('2026-01-01T00:00:00.000Z'), skipped: undefined },
      },
      { newId: () => 'id-1', now: () => fixedNow },
    );
    const wire = toWireEnvelope(envelope);
    expect(wire).toEqual(JSON.parse(JSON.stringify(envelope)));
    expect(wire.data).toEqual({ at: '2026-01-01T00:00:00.000Z' });
  });

  it('rejects envelopes that do not validate', () => {
    const envelope = createEnvelope(
      { type: 't', source: 's', data: 1 },
      { newId: () => '' },
    );
    expect(() => toWireEnvelope(envelope)).toThrow(
      expect.objectContaining({ code: MessagingErrorCode.InvalidEnvelope }),
    );
  });

  it('rejects envelopes over 256 KB', () => {
    const envelope = createEnvelope(
      { type: 't', source: 's', data: 'x'.repeat(MAX_ENVELOPE_BYTES) },
      { newId: () => 'id-1', now: () => fixedNow },
    );
    expect(() => toWireEnvelope(envelope)).toThrow(
      expect.objectContaining({ code: MessagingErrorCode.PayloadTooLarge }),
    );
  });

  it('measures size in bytes of the JSON encoding', () => {
    expect(envelopeSizeBytes({ a: 'é' })).toBe(
      Buffer.byteLength(JSON.stringify({ a: 'é' })),
    );
  });
});
