import { UserRefSchema } from '../user-ref.schema.js';
import { CalendarDateSchema } from '../calendar-date.schema.js';
import {
  TenantMoveAckSchema,
  TenantMoveProgressSchema,
  TenantMoveRefSchema,
  TenantMoveVerificationSchema,
} from '../tenant-move.schema.js';

const ID = '0190f2a4-7b3c-7d4e-8f00-000000000001';
const OTHER = '0190f2a4-7b3c-7d4e-8f00-000000000002';

describe('UserRefSchema', () => {
  it('needs both the user and the home tenant', () => {
    expect(
      UserRefSchema.safeParse({ userId: ID, homeTenantId: OTHER }).success,
    ).toBe(true);
    expect(UserRefSchema.safeParse({ userId: ID }).success).toBe(false);
  });
});

describe('CalendarDateSchema', () => {
  it.each(['2026-11-16', '1999-01-31'])('accepts %s', (value) => {
    expect(CalendarDateSchema.safeParse(value).success).toBe(true);
  });

  it.each(['2026-11-16T00:00:00Z', '16/11/2026', '2026-1-1', ''])(
    'rejects %s',
    (value) => {
      expect(CalendarDateSchema.safeParse(value).success).toBe(false);
    },
  );
});

describe('tenant move schemas', () => {
  it('validates the reference of a move and rejects unknown fields', () => {
    const move = {
      moveId: ID,
      tenantId: OTHER,
      targetGroup: 'group-b',
      targetRegion: 'sa-east-1',
    };
    expect(TenantMoveRefSchema.safeParse(move).success).toBe(true);
    expect(TenantMoveRefSchema.safeParse({ ...move, extra: 1 }).success).toBe(
      false,
    );
  });

  it('validates the progress, the verification and the acknowledgement', () => {
    expect(
      TenantMoveProgressSchema.safeParse({
        tables: [{ table: 'tasks', copiedRows: 10, pendingRows: 0 }],
        caughtUp: true,
      }).success,
    ).toBe(true);
    expect(
      TenantMoveVerificationSchema.safeParse({
        verified: true,
        tables: [
          {
            table: 'tasks',
            sourceRows: 10,
            targetRows: 10,
            sourceChecksum: 'abc123',
            targetChecksum: 'abc123',
          },
        ],
      }).success,
    ).toBe(true);
    expect(TenantMoveAckSchema.safeParse({ moveId: ID }).success).toBe(true);
    expect(
      TenantMoveProgressSchema.safeParse({
        tables: [{ table: 'tasks', copiedRows: -1, pendingRows: 0 }],
        caughtUp: true,
      }).success,
    ).toBe(false);
  });
});
