import type { Permission, UserAccess } from '@contracts/identity';
import { ActorGuards, type Actor } from '@platform/auth';
import type { UserRef } from '../../../../shared/types/user-ref.type.js';
import { AccessFacade } from '../../application/access.facade.js';
import type { UserTenant } from '../../domain/user-tenant.js';
import { IdentityError } from '../../../../shared/errors/identity.error.js';

const keyOf = (userId: string, tenantId: string): string =>
  `${userId}@${tenantId}`;

/** Accesos, membresías y tenants predeterminados en memoria. */
export class InMemoryAccessFacade extends AccessFacade {
  readonly added: Array<{
    tenantId: string;
    ref: UserRef;
    groupIds: readonly string[];
  }> = [];
  private readonly accesses = new Map<string, UserAccess>();
  private readonly memberships = new Set<string>();
  private readonly defaults = new Map<string, string>();
  private readonly mfaEveryLogin = new Set<string>();
  private readonly groupPermissions = new Map<string, readonly Permission[]>();

  setAccess(userId: string, tenantId: string, access: UserAccess): this {
    this.accesses.set(keyOf(userId, tenantId), access);
    return this;
  }

  addMembership(userId: string, tenantId: string): this {
    this.memberships.add(keyOf(userId, tenantId));
    return this;
  }

  /** Permisos que otorga un grupo: los usa `assertCanGrantGroups`. */
  setGroupPermissions(
    groupId: string,
    permissions: readonly Permission[],
  ): this {
    this.groupPermissions.set(groupId, permissions);
    return this;
  }

  setDefaultTenant(userId: string, tenantId: string): this {
    this.defaults.set(userId, tenantId);
    return this;
  }

  requireMfaOnEveryLogin(userId: string, tenantId: string): this {
    this.mfaEveryLogin.add(keyOf(userId, tenantId));
    return this;
  }

  async resolve(userId: string, tenantId: string): Promise<UserAccess> {
    const access = this.accesses.get(keyOf(userId, tenantId));
    if (access === undefined) {
      throw new Error('Access not found');
    }
    return access;
  }

  async isMember(userId: string, tenantId: string): Promise<boolean> {
    return this.memberships.has(keyOf(userId, tenantId));
  }

  async defaultTenant(ref: UserRef): Promise<string> {
    const tenantId = this.defaults.get(ref.userId);
    if (tenantId === undefined) {
      throw new Error('Default tenant not found');
    }
    return tenantId;
  }

  async requiresMfaOnEveryLogin(
    ref: UserRef,
    tenantId: string,
  ): Promise<boolean> {
    return this.mfaEveryLogin.has(keyOf(ref.userId, tenantId));
  }

  async addMember(
    tenantId: string,
    ref: UserRef,
    groupIds: readonly string[],
  ): Promise<void> {
    this.added.push({ tenantId, ref, groupIds });
    this.memberships.add(keyOf(ref.userId, tenantId));
  }

  async assertCanGrantGroups(
    tenantId: string,
    actor: Actor | undefined,
    groupIds: readonly string[],
  ): Promise<void> {
    const granted =
      actor === undefined || ActorGuards.isSystem(actor)
        ? []
        : ActorGuards.isServiceAccount(actor)
          ? actor.permissions
          : (this.accesses.get(keyOf(actor.userId, tenantId))?.permissions ??
            []);
    const missing = groupIds
      .flatMap((id) => this.groupPermissions.get(id) ?? [])
      .filter((permission) => !granted.includes(permission));
    if (missing.length > 0) {
      throw IdentityError.forbidden(missing);
    }
  }

  readonly setUp: Array<{ tenantId: string; owner?: UserRef }> = [];

  async setupTenant(tenantId: string, owner?: UserRef): Promise<void> {
    this.setUp.push(owner === undefined ? { tenantId } : { tenantId, owner });
    if (owner !== undefined) {
      this.memberships.add(keyOf(owner.userId, tenantId));
    }
  }

  readonly projected: Array<{ tenantId: string; ref: UserRef }> = [];

  async projectMembership(tenantId: string, ref: UserRef): Promise<void> {
    this.projected.push({ tenantId, ref });
  }

  async tenantsOf(ref: UserRef): Promise<readonly UserTenant[]> {
    return [...this.memberships]
      .filter((key) => key.startsWith(`${ref.userId}@`))
      .map((key) => ({
        userId: ref.userId,
        tenantId: key.slice(ref.userId.length + 1),
        joinedAt: new Date(0),
      }));
  }
}
