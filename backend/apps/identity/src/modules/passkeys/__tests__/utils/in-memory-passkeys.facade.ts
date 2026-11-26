import type { UserRef } from '../../../../shared/types/user-ref.type.js';
import { PasskeysFacade } from '../../application/passkeys.facade.js';

/** In-memory passkeys: only remembers which users have any and which region they were moved to. */
export class InMemoryPasskeysFacade extends PasskeysFacade {
  private readonly owners = new Set<string>();
  private readonly regions = new Map<string, string>();

  withPasskey(userId: string): this {
    this.owners.add(userId);
    return this;
  }

  override async hasPasskeys(user: UserRef): Promise<boolean> {
    return this.owners.has(user.userId);
  }

  override async forget(user: UserRef): Promise<void> {
    this.owners.delete(user.userId);
  }

  override async relocateHomeTenant(
    homeTenantId: string,
    region: string,
  ): Promise<void> {
    this.regions.set(homeTenantId, region);
  }

  /** The region the credentials of the users of a home tenant were pointed to. */
  regionOfHomeTenant(homeTenantId: string): string | undefined {
    return this.regions.get(homeTenantId);
  }
}
