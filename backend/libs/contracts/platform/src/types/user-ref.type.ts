/**
 * Reference to a user. The `homeTenantId` is the tenant where the user's data lives
 * (ADR 0023): with it any service routes to the user's shard.
 */
export interface UserRef {
  userId: string;
  homeTenantId: string;
}
