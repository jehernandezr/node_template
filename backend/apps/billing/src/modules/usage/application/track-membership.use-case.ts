import { ShardScopes } from '@platform/persistence';
import { Injectable } from '@nestjs/common';
import {
  MembershipChangeKind,
  type MembershipChangedPayload,
} from '@contracts/identity';
import { TransactionManager } from '@platform/kernel';
import { MemberRoster } from '../domain/member-roster.js';

/** Keeps the tenant's member list: today's count is the user usage (see `LocalUsageFacade`). */
@Injectable()
export class TrackMembership {
  constructor(
    private readonly roster: MemberRoster,
    private readonly shard: ShardScopes,
    private readonly transactions: TransactionManager,
  ) {}

  execute(change: MembershipChangedPayload): Promise<void> {
    if (change.kind === MembershipChangeKind.GroupsChanged) {
      return Promise.resolve();
    }
    return this.shard.inTenantShard(change.tenantId, () =>
      this.transactions.runInTransaction(async () => {
        if (change.kind === MembershipChangeKind.Added) {
          await this.roster.join(change.userId);
        } else {
          await this.roster.leave(change.userId);
        }
      }),
    );
  }
}
