import { FinishTenantMoveOperation, IdentitySaga } from '@contracts/identity';
import type { TenantMoveRef } from '@contracts/platform';
import { SagaDefinition, type SagaFlow } from '@platform/saga';
import { TenantMoveErrorCode } from '@platform/tenant-move';
import { TenantMoveParticipants } from './tenant-move-participants.js';

/** Lo que la saga de traslado lleva de paso en paso: el mismo `TenantMoveRef` para cada servicio. */
export type MoveTenantState = TenantMoveRef;

/**
 * Traslado de un tenant a otro grupo de shards, de su región o de otra. Antes del pivote cada servicio copia con
 * las escrituras abiertas hasta alcanzar al origen (`sync`) y después cierra su compuerta, levanta la barrera del
 * shard de origen, copia la última ronda y verifica (`finalize`); si algo falla, `abort` descarta la copia y vuelve
 * a abrir las escrituras en el origen. El pivote es el cambio de directorio: desde ahí cada servicio apunta al
 * destino (`switch`), empezando por identity, y ya no se deshace. El último paso anota el traslado como cambiado:
 * solo entonces corre la gracia antes de limpiar el origen, porque hasta que el último servicio apunta al destino su
 * origen sigue vivo. Una ronda pendiente de `sync` o `finalize` es avance y no gasta suspensiones; el plazo de la saga
 * (`TENANT_MOVE_DEADLINE_MS`) acota el tramo antes del pivote y, si vence, la saga compensa.
 */
export class MoveTenantSaga extends SagaDefinition<MoveTenantState> {
  readonly type = IdentitySaga.MoveTenant;

  protected define(flow: SagaFlow<MoveTenantState>): void {
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
