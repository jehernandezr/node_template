import type { UsageLevel } from '../domain/usage-ledger.js';

/** Reads the usage levels of a tenant for entitlements and invoicing. */
export abstract class UsageFacade {
  /**
   * Returns the usage per metric in the period: users are today's members and the other metrics, what was
   * recorded between `from` and `to`.
   */
  abstract levels(
    tenantId: string,
    from: string,
    to: string,
  ): Promise<readonly UsageLevel[]>;
}
