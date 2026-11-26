import { FinishTenantMoveOperation, IdentitySaga } from '@contracts/identity';
import type { TenantMoveRef } from '@contracts/platform';
import { SagaDefinition, type SagaFlow } from '@platform/saga';
import { TenantMoveErrorCode } from '@platform/tenant-move';
import { TenantMoveParticipants } from './tenant-move-participants.js';

/** What the move saga carries from step to step: the same `TenantMoveRef` for each service. */
export type MoveTenantState = TenantMoveRef;

/**
 * Move of a tenant to another shard group, in its region or another one. Before the pivot each service copies with
 * writes open until it catches up with the source (`sync`) and then closes its gate, raises the barrier of the
 * source shard, copies the last round and verifies (`finalize`); if something fails, `abort` discards the copy and
 * reopens writes on the source. The pivot is the directory switch: from there each service points to the
 * target (`switch`), starting with identity, and it is no longer undone. The last step records the move as switched:
 * only then does the grace period run before cleaning the source, because until the last service points to the target its
 * source is still live. A pending round of `sync` or `finalize` is progress and does not spend suspensions; the saga's deadline
 * (`TENANT_MOVE_DEADLINE_MS`) bounds the stretch before the pivot and, if it expires, the saga compensates.
 */
export class MoveTenantSaga extends SagaDefinition<MoveTenantState> {
  readonly type = IdentitySaga.MoveTenant;

  protected override define(flow: SagaFlow<MoveTenantState>): void {
    const participants = TenantMoveParticipants.ALL;
    for (const service of participants) {
      flow
        .step(service.tenantMoveSync)
        .input(MoveTenantSaga.ref)
        .progressOn(TenantMoveErrorCode.RoundPending);
    }
    participants
      .map((service) =>
        flow
          .step(service.tenantMoveFinalize)
          .input(MoveTenantSaga.ref)
          .progressOn(TenantMoveErrorCode.RoundPending),
      )
      .at(-1)
      ?.pivot();
    for (const service of participants) {
      flow.step(service.tenantMoveSwitch).input(MoveTenantSaga.ref);
    }
    flow.step(FinishTenantMoveOperation).input(MoveTenantSaga.ref);
  }

  private static ref(state: MoveTenantState): TenantMoveRef {
    return {
      moveId: state.moveId,
      tenantId: state.tenantId,
      targetGroup: state.targetGroup,
      targetRegion: state.targetRegion,
    };
  }
}
