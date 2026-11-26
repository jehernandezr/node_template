/** The tenants the service serves in its region, according to its shard directory. */
export abstract class ReportTenants {
  /**
   * Lists the active tenants of the region, for the backfill.
   * @returns Their ids.
   */
  abstract active(): Promise<readonly string[]>;
}
