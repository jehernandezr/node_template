/** How a tenant's rows in a table are reached. */
export enum TenantMoveSelectorKind {
  /** The table has a column with the tenant id. */
  TenantColumn = 'tenant-column',
  /** The rows hang from a parent table of the same manifest. */
  ViaParent = 'via-parent',
}
