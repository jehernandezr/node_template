/** Los tenants que el servicio atiende en su región, según su directorio de shards. */
export abstract class ReportTenants {
  abstract active(): Promise<readonly string[]>;
}
