/** The billable members of the tenant of the open `ShardScope`, according to identity's membership changes. */
export abstract class MemberRoster {
  abstract join(userId: string): Promise<void>;
  abstract leave(userId: string): Promise<void>;
  abstract count(): Promise<number>;
}
