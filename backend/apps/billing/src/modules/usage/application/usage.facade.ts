import type { UsageLevel } from '../domain/usage-ledger.js';

/** Reads the usage levels of a tenant for entitlements and invoicing. */
export abstract class UsageFacade {
  /**
   * Returns the usage per metric in the period: users are today's members and the other metrics, what was
   * recorded between `from` and `to`.
   * @param tenantId Tenant to read.
   * @param from First day, `YYYY-MM-DD`.
   * @param to Last day, `YYYY-MM-DD`.
   * @returns The usage of each metric.
   */
  abstract levels(
    tenantId: string,
    from: string,
    to: string,
  ): Promise<readonly UsageLevel[]>;
}
