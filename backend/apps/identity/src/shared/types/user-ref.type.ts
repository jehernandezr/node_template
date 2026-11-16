/** Un usuario y el tenant de origen con el que se llega a su shard. */
export interface UserRef {
  readonly userId: string;
  readonly homeTenantId: string;
}
