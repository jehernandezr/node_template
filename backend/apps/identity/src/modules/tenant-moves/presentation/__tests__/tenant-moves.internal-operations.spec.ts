import { FixedClock } from '@platform/kernel/test-utils';
import { CallOutcome } from '@platform/primitives';
import { FinishTenantMove } from '../../application/finish-tenant-move.use-case.js';
import { TenantMoveStatus } from '../../domain/tenant-move-status.enum.js';
import { InMemoryTenantMoveLog } from '../../__tests__/utils/index.js';
import { TenantMovesInternalOperations } from '../tenant-moves.internal-operations.js';

const MOVE = {
  moveId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f12',
  tenantId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a05',
  targetGroup: 'sa-group-1',
  targetRegion: 'sa-east-1',
};

describe('TenantMovesInternalOperations', () => {
  it('answers the last step of the saga with the move it closed', async () => {
    const clock = new FixedClock(new Date('2026-11-24T10:00:00.000Z'));
    const log = new InMemoryTenantMoveLog();
    await log.start({
      ...MOVE,
      sagaId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f11',
      status: TenantMoveStatus.Running,
      startedAt: clock.now(),
    });
    const handlers = new TenantMovesInternalOperations(
      new FinishTenantMove(log, clock),
    );

    const result = await handlers.finish(MOVE);

    expect(result).toEqual({
      outcome: CallOutcome.success({ moveId: MOVE.moveId }),
    });
    expect(log.find(MOVE.moveId)?.status).toBe(TenantMoveStatus.Switched);
  });
});
