/** Projection, in the user's shard, of one of their memberships. */
export interface UserTenant {
  readonly userId: string;
  readonly tenantId: string;
  readonly joinedAt: Date;
}
