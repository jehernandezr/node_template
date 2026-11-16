import { PlatformErrorCode } from '@contracts/platform';
import { OutboxStatus } from '@platform/messaging';
import { EnvelopeBuilder } from '@platform/messaging/test-utils';
import { OutboxEntity } from '../entities/outbox.entity.js';
import { OutboxRecordMapper } from '../stores/outbox-record.mapper.js';

const CREATED_AT = new Date('2026-01-01T00:00:00.000Z');
const NEXT_AT = new Date('2026-01-01T00:05:00.000Z');
const LEASE_AT = new Date('2026-01-01T00:01:00.000Z');

function aRow(overrides: Partial<OutboxEntity> = {}): OutboxEntity {
  return Object.assign(new OutboxEntity(), {
    id: 'm-1',
    seq: 1,
    envelope: EnvelopeBuilder.anEnvelope({ id: 'm-1' }),
    status: OutboxStatus.Pending,
    attempts: 2,
    nextAttemptAt: NEXT_AT,
    createdAt: CREATED_AT,
    updatedAt: CREATED_AT,
    groupId: null,
    delayMs: null,
    lastError: null,
    leaseOwner: null,
    leaseToken: null,
    leaseExpiresAt: null,
    ...overrides,
  });
}

describe('OutboxRecordMapper', () => {
  describe('when every optional column is set', () => {
    it('maps the row to a record with all its optional fields', () => {
      const record = OutboxRecordMapper.toRecord(
        aRow({
          groupId: 'order-1',
          delayMs: 5_000,
          lastError: 'timeout',
          leaseOwner: 'relay-a',
          leaseToken: 'token-a',
          leaseExpiresAt: LEASE_AT,
        }),
      );

      expect(record).toEqual({
        id: 'm-1',
        envelope: EnvelopeBuilder.anEnvelope({ id: 'm-1' }),
        status: OutboxStatus.Pending,
        attempts: 2,
        nextAttemptAt: NEXT_AT,
        createdAt: CREATED_AT,
        groupId: 'order-1',
        delayMs: 5_000,
        lastError: 'timeout',
        leaseOwner: 'relay-a',
        leaseToken: 'token-a',
        leaseExpiresAt: LEASE_AT,
      });
    });
  });

  describe('when the optional columns are null', () => {
    it('leaves the optional keys out of the record', () => {
      const record = OutboxRecordMapper.toRecord(aRow());

      expect(record).not.toHaveProperty('groupId');
      expect(record).not.toHaveProperty('delayMs');
      expect(record).not.toHaveProperty('lastError');
      expect(record).not.toHaveProperty('leaseOwner');
      expect(record).not.toHaveProperty('leaseToken');
      expect(record).not.toHaveProperty('leaseExpiresAt');
    });
  });

  describe('when the status is not an OutboxStatus', () => {
    it('rejects with PersistenceCorruptRow', () => {
      expect(() =>
        OutboxRecordMapper.toRecord(aRow({ status: 'unknown' as never })),
      ).toThrow(
        expect.objectContaining({
          code: PlatformErrorCode.PersistenceCorruptRow,
        }),
      );
    });
  });
});
