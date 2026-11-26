import { PostgresSqlState } from '@platform/persistence';
import { QueryFailedError } from 'typeorm';
import { TenantMoveErrorCode } from '../../../errors/tenant-move-error-code.enum.js';
import { TenantMoveError } from '../../../errors/tenant-move.error.js';
import { ForeignKeyRound } from '../foreign-key-round.js';

class SqlStateError extends Error {
  constructor(readonly code: string) {
    super(`sql state ${code}`);
  }
}

describe('ForeignKeyRound', () => {
  it('returns the result of the round', async () => {
    await expect(ForeignKeyRound.run(async () => 7)).resolves.toBe(7);
  });

  it('turns a foreign key violation into a pending round', async () => {
    const round = ForeignKeyRound.run(async () => {
      throw new SqlStateError(PostgresSqlState.ForeignKeyViolation);
    });

    await expect(round).rejects.toBeInstanceOf(TenantMoveError);
    await expect(round).rejects.toMatchObject({
      code: TenantMoveErrorCode.RoundPending,
    });
  });

  it('turns a TypeORM query failure with a foreign key violation into a pending round', async () => {
    const round = ForeignKeyRound.run(async () => {
      throw new QueryFailedError(
        'INSERT INTO "entries" ...',
        [],
        new SqlStateError(PostgresSqlState.ForeignKeyViolation),
      );
    });

    await expect(round).rejects.toMatchObject({
      code: TenantMoveErrorCode.RoundPending,
    });
  });

  it('rethrows any other failure as is', async () => {
    const failure = new SqlStateError('40001');

    await expect(
      ForeignKeyRound.run(async () => {
        throw failure;
      }),
    ).rejects.toBe(failure);
  });
});
