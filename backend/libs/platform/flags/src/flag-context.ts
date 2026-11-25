/** Whom a flag is evaluated for: the user in their active tenant, the tenant's plan and its groups. */
export interface FlagContext {
  readonly tenantId: string;
  readonly userId: string;
  readonly plan?: string;
  readonly groups?: readonly string[];
}
