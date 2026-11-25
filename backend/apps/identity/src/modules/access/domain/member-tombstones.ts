/** The tombstones removed members leave in the tenants they no longer belong to, in every shard. */
export abstract class MemberTombstones {
  /**
   * Deletes for good every tombstone a user left in any tenant, because their account is being erased.
   * Repeating it changes nothing.
   * @param userId Erased user.
   * @throws ShardsUnavailableError if some shard could not be cleaned; the erasure is repeated.
   */
  abstract forget(userId: string): Promise<void>;
}
