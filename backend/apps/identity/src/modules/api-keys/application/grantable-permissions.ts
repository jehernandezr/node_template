import { Injectable } from '@nestjs/common';
import { IdentityErrorCode, type Permission } from '@contracts/identity';
import { ActorGuards, type Actor } from '@platform/auth';
import { IdentityError } from '../../../shared/errors/identity.error.js';
import { AccessFacade } from '../../access/index.js';

/** A service account, or a key that hands out its permissions, cannot carry a permission its configurer lacks. */
@Injectable()
export class GrantablePermissions {
  constructor(private readonly access: AccessFacade) {}

  /**
   * Checks that the actor holds every requested permission. The system actor holds none.
   * @param actor Who configures the account or the key.
   * @param permissions Permissions the account would hand out.
   * @throws IdentityError `IDENTITY.API_KEY.PERMISSION_NOT_GRANTABLE` if any of them is not the actor's.
   */
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
