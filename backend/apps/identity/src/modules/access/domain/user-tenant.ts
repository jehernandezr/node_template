/** Proyección en el shard del usuario de una de sus membresías. */
export interface UserTenant {
  readonly userId: string;
  readonly tenantId: string;
  readonly joinedAt: Date;
}
