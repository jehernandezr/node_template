import { Injectable } from '@nestjs/common';
import type { Permission } from '@contracts/identity';
import { ActorGuards, type Actor } from '@platform/auth';
import { AccessResolver } from './access-resolver.js';

/** Los permisos que tiene quien edita, para no dejarle otorgar más de los suyos. */
@Injectable()
export class ActorPermissions {
  constructor(private readonly resolver: AccessResolver) {}

  async of(actor: Actor | undefined): Promise<readonly Permission[]> {
    if (actor === undefined || ActorGuards.isSystem(actor)) {
      return [];
    }
    if (ActorGuards.isServiceAccount(actor)) {
      return actor.permissions;
    }
    return (await this.resolver.resolve(actor.userId, actor.tenantId))
      .permissions;
  }
}
