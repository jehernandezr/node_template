import { Injectable } from '@nestjs/common';
import { IdentityErrorCode, type Permission } from '@contracts/identity';
import { ActorGuards, type Actor } from '@platform/auth';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { AccessFacade } from '../../access/index.js';

/** Una cuenta de servicio no puede tener un permiso que quien la configura no tiene. */
@Injectable()
export class GrantablePermissions {
  constructor(private readonly access: AccessFacade) {}

  /** @throws IdentityError `IDENTITY.API_KEY.PERMISSION_NOT_GRANTABLE` si pide un permiso ajeno. */
  async assert(
    actor: Actor | undefined,
    permissions: readonly Permission[],
  ): Promise<void> {
    const granted = await this.grantedTo(actor);
    if (permissions.some((permission) => !granted.includes(permission))) {
      throw new IdentityError(IdentityErrorCode.ApiKeyPermissionNotGrantable);
    }
  }

  private async grantedTo(
    actor: Actor | undefined,
  ): Promise<readonly Permission[]> {
    if (actor === undefined || ActorGuards.isSystem(actor)) {
      return [];
    }
    if (ActorGuards.isServiceAccount(actor)) {
      return actor.permissions;
    }
    return (await this.access.resolve(actor.userId, actor.tenantId))
      .permissions;
  }
}
