import { Injectable } from '@nestjs/common';
import type { TenantMoveRef } from '@contracts/platform';
import { TenantMoveListener } from '@platform/tenant-move';
import { ApiKeysFacade } from '../../api-keys/index.js';
import { PasskeysFacade } from '../../passkeys/index.js';
import { TenantsFacade } from '../../tenants/index.js';
import { UsersFacade } from '../../users/index.js';
import { TenantMoveLog } from '../domain/tenant-move-log.js';

/**
 * What identity does besides moving its rows: points to the target region the global indexes that lead to
 * a tenant or its users (slug, emails, passkeys and API key prefixes), and records in the log the move that
 * is cancelled. The switch is not recorded here: identity is the first of the services that point to the target, and
 * the last step of the saga, `FinishTenantMove`, records it when all of them have done so.
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

  override async switched(move: TenantMoveRef): Promise<void> {
    await this.tenants.relocate(move.tenantId, move.targetRegion);
    await this.users.relocateHomeTenant(move.tenantId, move.targetRegion);
    await this.passkeys.relocateHomeTenant(move.tenantId, move.targetRegion);
    await this.apiKeys.relocateTenant(move.tenantId, move.targetRegion);
  }

  override async aborted(move: TenantMoveRef): Promise<void> {
    await this.log.markAborted(move.moveId);
  }
}
