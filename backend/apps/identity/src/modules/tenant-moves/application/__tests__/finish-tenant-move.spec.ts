import { FixedClock } from '@platform/kernel/test-utils';
import { TenantMoveStatus } from '../../domain/tenant-move-status.enum.js';
import { InMemoryTenantMoveLog } from '../../__tests__/utils/index.js';
import { FinishTenantMove } from '../finish-tenant-move.use-case.js';

const MOVE = {
  moveId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f12',
  tenantId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9a05',
  targetGroup: 'sa-group-1',
  targetRegion: 'sa-east-1',
};

describe('FinishTenantMove', () => {
  const setup = async () => {
    const clock = new FixedClock(new Date('2026-11-24T10:00:00.000Z'));
    const log = new InMemoryTenantMoveLog();
    await log.start({
      ...MOVE,
      sagaId: '0192f1b4-7c3a-7d2e-9a41-5b6c7d8e9f11',
      status: TenantMoveStatus.Running,
      startedAt: clock.now(),
    });
    return { clock, log, finish: new FinishTenantMove(log, clock) };
  };

  it('records the move as switched from the moment every service points to the target', async () => {
    const { clock, log, finish } = await setup();

    const ack = await finish.execute(MOVE);

    expect(ack).toEqual({ moveId: MOVE.moveId });
    expect(log.find(MOVE.moveId)).toMatchObject({
      status: TenantMoveStatus.Switched,
      switchedAt: clock.now(),
    });
  });

  it('keeps the first instant when the saga repeats the step', async () => {
    const { clock, log, finish } = await setup();
    const first = clock.now();

    await finish.execute(MOVE);
    clock.advance(60_000);
    await finish.execute(MOVE);

    expect(log.find(MOVE.moveId)?.switchedAt).toEqual(first);
  });
});
