/** Where a tenant's write gate is closed during its move (`TENANT_WRITE_GATE`). */
export enum TenantWriteGateKind {
  /** The tenant placement in the directory switches to `Migrating`. The default. */
  Directory = 'directory',
  /** A lock in the service's Valkey. */
  Valkey = 'valkey',
}
