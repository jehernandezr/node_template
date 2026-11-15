import { InternalApiErrorCode } from '../../errors/internal-api-error-code.enum.js';
import { CallMetaReader } from '../call-meta-reader.js';
import { InternalHeader } from '../internal-header.enum.js';

describe('CallMetaReader', () => {
  describe('normalize', () => {
    it('takes the first value of a repeated header', () => {
      const reader = new CallMetaReader();

      expect(
        reader.normalize({
          [InternalHeader.TenantId]: ['tenant-1', 'tenant-2'],
        }),
      ).toEqual({ [InternalHeader.TenantId]: 'tenant-1' });
    });

    it('lowercases header names', () => {
      const reader = new CallMetaReader();

      expect(reader.normalize({ 'X-Actor-Id': 'actor-1' })).toEqual({
        [InternalHeader.ActorId]: 'actor-1',
      });
    });

    it('omits a header whose value is not text', () => {
      const reader = new CallMetaReader();

      expect(reader.normalize({ [InternalHeader.ActorId]: [] })).toEqual({});
    });
  });

  describe('read', () => {
    const REQUIRED = {
      [InternalHeader.IdempotencyKey]: 'key-1',
      [InternalHeader.Deadline]: '1767225600000',
      [InternalHeader.TimeoutMs]: '5000',
    };

    it('reads the required headers and leaves out the optional ones', () => {
      const meta = new CallMetaReader().read(REQUIRED);

      expect(meta).toEqual({
        idempotencyKey: 'key-1',
        deadline: 1767225600000,
        timeoutMs: 5000,
      });
    });

    it('reads the optional headers when they are present', () => {
      const meta = new CallMetaReader().read({
        ...REQUIRED,
        [InternalHeader.Traceparent]:
          '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
        [InternalHeader.TenantId]: 'tenant-1',
        [InternalHeader.ActorId]: 'actor-1',
      });

      expect(meta).toEqual({
        idempotencyKey: 'key-1',
        deadline: 1767225600000,
        timeoutMs: 5000,
        traceparent: '00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01',
        tenantId: 'tenant-1',
        actorId: 'actor-1',
      });
    });

    it.each([
      [
        'the idempotency key is missing',
        { [InternalHeader.IdempotencyKey]: undefined },
      ],
      [
        'the idempotency key is blank',
        { [InternalHeader.IdempotencyKey]: '   ' },
      ],
      ['the deadline is missing', { [InternalHeader.Deadline]: undefined }],
      ['the timeout is not a number', { [InternalHeader.TimeoutMs]: 'abc' }],
    ])('rejects a call when %s', (_label, override) => {
      expect(() =>
        new CallMetaReader().read({ ...REQUIRED, ...override }),
      ).toThrow(
        expect.objectContaining({ code: InternalApiErrorCode.InvalidRequest }),
      );
    });
  });
});
