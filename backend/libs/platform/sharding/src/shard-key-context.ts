/** Who is asking, as the request context knows it. */
export interface ShardKeyContext {
  readonly tenantId: string;
  /** Required by `ShardKey.User`. */
  readonly userId?: string;
}
