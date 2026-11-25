/** A user and the home tenant through which their shard is reached. */
export interface UserRef {
  readonly userId: string;
  readonly homeTenantId: string;
}
