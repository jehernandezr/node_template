import { Injectable } from '@nestjs/common';
import type { TenantMoveAck, TenantMoveRef } from '@contracts/platform';
import { Clock } from '@platform/kernel';
import { TenantMoveLog } from '../domain/tenant-move-log.js';

/**
 * Anota el traslado como cambiado cuando cada servicio ya apunta al destino. Desde ese instante corre la gracia que
 * espera `TenantMoveCleanupJob` para borrar el origen; repetirlo conserva el primer instante.
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
