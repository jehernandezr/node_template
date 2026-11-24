import { Injectable } from '@nestjs/common';
import type { TenantMoveRef } from '@contracts/platform';
import { TenantMoveListener } from '@platform/tenant-move';
import { ApiKeysFacade } from '../../api-keys/index.js';
import { PasskeysFacade } from '../../passkeys/index.js';
import { TenantsFacade } from '../../tenants/index.js';
import { UsersFacade } from '../../users/index.js';
import { TenantMoveLog } from '../domain/tenant-move-log.js';

/**
 * Lo que identity hace además de mover sus filas: apunta a la región de destino los índices globales que llevan a
 * un tenant o a sus usuarios (slug, emails, passkeys y prefijos de API keys), y anota en la bitácora el traslado que
 * se cancela. El cambio no se anota aquí: identity es el primero de los servicios que apuntan al destino, y lo anota
 * el último paso de la saga, `FinishTenantMove`, cuando todos lo hicieron.
 */
@Injectable()
export class IdentityTenantMoveListener extends TenantMoveListener {
  constructor(
    private readonly tenants: TenantsFacade,
    private readonly users: UsersFacade,
    private readonly passkeys: PasskeysFacade,
    private readonly apiKeys: ApiKeysFacade,
    private readonly log: TenantMoveLog,
  ) {
    super();
  }

  async switched(move: TenantMoveRef): Promise<void> {
    await this.tenants.relocate(move.tenantId, move.targetRegion);
    await this.users.relocateHomeTenant(move.tenantId, move.targetRegion);
    await this.passkeys.relocateHomeTenant(move.tenantId, move.targetRegion);
    await this.apiKeys.relocateTenant(move.tenantId, move.targetRegion);
  }

  async aborted(move: TenantMoveRef): Promise<void> {
    await this.log.markAborted(move.moveId);
  }
}
