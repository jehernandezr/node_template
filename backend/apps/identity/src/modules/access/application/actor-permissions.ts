import { Injectable } from '@nestjs/common';
import type { Permission } from '@contracts/identity';
import { ActorGuards, type Actor } from '@platform/auth';
import { AccessResolver } from './access-resolver.js';

/** The permissions the editor has, so they cannot grant more than their own. */
@Injectable()
export class ActorPermissions {
  constructor(private readonly resolver: AccessResolver) {}

  /**
   * Reads the effective permissions of an actor in its tenant: a member's or a service account's.
   * @param actor Actor of the request; none for an anonymous one.
   * @returns Its permissions, empty without an actor.
   */
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
