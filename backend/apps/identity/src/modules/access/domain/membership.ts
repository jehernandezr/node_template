/** A user inside a tenant, with their groups and their permission version in that tenant. */
export interface Membership {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly homeTenantId: string;
  readonly groupIds: readonly string[];
  /** Goes up when the groups of this user change: it is the second part of the `pv` claim. */
  readonly permissionVersion: number;
  readonly joinedAt: Date;
  /** When the deletion of the user's account reserved their departure, or `null` if they are staying. */
  readonly leavingSince: Date | null;
  readonly version?: number;
}
