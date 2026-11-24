import { UserStatus } from '@contracts/identity';
import { IdGenerator } from '@platform/kernel';
import { SequentialIdGenerator } from '@platform/kernel/test-utils';
import type { UserRef } from '../../../../shared/types/user-ref.type.js';
import { normalizeEmail } from '../../../../shared/utils/email-normalization.js';
import { UsersFacade } from '../../application/users.facade.js';
import type { RegisterUserInput } from '../../domain/register-user-input.js';
import type { UserSnapshot } from '../../domain/user-snapshot.js';

/** Usuarios en memoria. Guarda los emails normalizados, como el adaptador real. */
export class InMemoryUsersFacade extends UsersFacade {
  readonly registered: RegisterUserInput[] = [];
  private readonly users = new Map<string, UserSnapshot>();
  private readonly regions = new Map<string, string>();

  constructor(private readonly ids: IdGenerator = new SequentialIdGenerator()) {
    super();
  }

  add(user: UserSnapshot): this {
    this.users.set(user.id, user);
    return this;
  }

  async findByEmail(email: string): Promise<UserSnapshot | undefined> {
    const normalized = normalizeEmail(email);
    return [...this.users.values()].find(
      (user) => normalizeEmail(user.email) === normalized,
    );
  }

  async getByRef(ref: UserRef): Promise<UserSnapshot> {
    const user = this.users.get(ref.userId);
    if (user === undefined) {
      throw new Error('User not found');
    }
    return user;
  }

  async refOf(userId: string): Promise<UserRef | undefined> {
    const user = this.users.get(userId);
    return user === undefined
      ? undefined
      : { userId: user.id, homeTenantId: user.homeTenantId };
  }

  async register(input: RegisterUserInput): Promise<UserRef> {
    const email = normalizeEmail(input.email);
    if ((await this.findByEmail(email)) !== undefined) {
      throw new Error('Email already registered');
    }
    const id = this.ids.next().toString();
    this.users.set(id, {
      id,
      homeTenantId: input.homeTenantId,
      email,
      status: UserStatus.PendingVerification,
      displayName: input.displayName,
      locale: input.locale,
    });
    this.registered.push(input);
    return { userId: id, homeTenantId: input.homeTenantId };
  }

  async setLastTenant(ref: UserRef, tenantId: string): Promise<void> {
    const user = this.users.get(ref.userId);
    if (user === undefined) {
      throw new Error('User not found');
    }
    this.users.set(ref.userId, { ...user, lastTenantId: tenantId });
  }

  async relocateHomeTenant(
    homeTenantId: string,
    region: string,
  ): Promise<void> {
    this.regions.set(homeTenantId, region);
  }

  /** La región a la que se apuntó el índice de los usuarios de un tenant de origen. */
  regionOfHomeTenant(homeTenantId: string): string | undefined {
    return this.regions.get(homeTenantId);
  }
}
