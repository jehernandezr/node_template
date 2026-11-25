/** The tenants the service serves in its region, according to its shard directory. */
export abstract class ReportTenants {
  abstract active(): Promise<readonly string[]>;
}
