/** The billable members of the tenant of the open `ShardScope`, according to identity's membership changes. */
export abstract class MemberRoster {
  /**
   * Counts a user as a member of the tenant in scope.
   * @param userId User who joined.
   */
  abstract join(userId: string): Promise<void>;
  /**
   * Stops counting a user as a member of the tenant in scope.
   * @param userId User who left.
   */
  abstract leave(userId: string): Promise<void>;
  /**
   * Counts the members of the tenant in scope.
   * @returns The number of members.
   */
  abstract count(): Promise<number>;
}
