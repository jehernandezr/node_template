import { Injectable } from '@nestjs/common';
import type { TenantMoveAck, TenantMoveRef } from '@contracts/platform';
import { Clock } from '@platform/kernel';
import { TenantMoveLog } from '../domain/tenant-move-log.js';

/**
 * Records the move as switched when every service already points to the target. From that moment runs the grace period that
 * `TenantMoveCleanupJob` waits before deleting the source; repeating it keeps the first moment.
 */
@Injectable()
export class FinishTenantMove {
  constructor(
    private readonly log: TenantMoveLog,
    private readonly clock: Clock,
  ) {}

  async execute(move: TenantMoveRef): Promise<TenantMoveAck> {
    await this.log.markSwitched(move.moveId, this.clock.now());
    return { moveId: move.moveId };
  }
}
