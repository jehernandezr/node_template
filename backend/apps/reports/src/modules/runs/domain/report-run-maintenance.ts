import type { UserRef } from '@contracts/platform';

/** A run of some tenant, for the jobs that walk all shards. */
export interface TenantRun {
  readonly tenantId: string;
  readonly runId: string;
}

/** Maintenance of the runs of all tenants, in all shards. */
export abstract class ReportRunMaintenance {
  /**
   * Marks as expired the ready runs whose result expired before `now` and returns them.
   * @param now Current instant.
   * @returns The expired runs with their tenants.
   */
  abstract expireBefore(now: Date): Promise<readonly TenantRun[]>;
  /**
   * Sets `replacement` as the requester of the runs the user requested.
   * @param userId User to replace.
   * @param replacement Anonymous user that takes its place.
   * @returns How many runs changed.
   */
  abstract replaceRequester(
    userId: string,
    replacement: UserRef,
  ): Promise<number>;
}
