/** Where a tenant ends up in a service when moved to a group. */
export interface TenantMoveTarget {
  readonly group: string;
  readonly region: string;
  /** Service logical shard in that group. */
  readonly shard: string;
}
