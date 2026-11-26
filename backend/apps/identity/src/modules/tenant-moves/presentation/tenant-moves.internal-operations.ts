import { Injectable } from '@nestjs/common';
import { FinishTenantMoveOperation } from '@contracts/identity';
import type { TenantMoveAck, TenantMoveRef } from '@contracts/platform';
import type { HandlerResult } from '@platform/internal-api';
import { InternalHandler } from '@platform/internal-api/nest';
import { CallOutcome } from '@platform/primitives';
import { FinishTenantMove } from '../application/finish-tenant-move.use-case.js';

/** The last step of `MoveTenant`, which only identity handles: the move log lives in its catalog. */
@Injectable()
export class TenantMovesInternalOperations {
  constructor(private readonly finishMove: FinishTenantMove) {}

  /**
   * Internal operation the move saga calls when the tenant was switched.
   * @param input Tenant and move.
   * @returns The acknowledgment.
   */
  @InternalHandler(FinishTenantMoveOperation)
  async finish(input: TenantMoveRef): Promise<HandlerResult<TenantMoveAck>> {
    return {
      outcome: CallOutcome.success(await this.finishMove.execute(input)),
    };
  }
}
