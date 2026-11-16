import type { UserAccess } from '@contracts/identity';
import type { UserRef } from '../../../../shared/types/user-ref.type.js';
import { AccessFacade } from '../../application/access.facade.js';

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

  setAccess(userId: string, tenantId: string, access: UserAccess): this {
    this.accesses.set(keyOf(userId, tenantId), access);
    return this;
  }

  addMembership(userId: string, tenantId: string): this {
    this.memberships.add(keyOf(userId, tenantId));
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
}
