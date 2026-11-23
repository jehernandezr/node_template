import { Injectable } from '@nestjs/common';
import {
  MembershipChangeKind,
  type MembershipChangedPayload,
} from '@contracts/identity';
import { TransactionManager } from '@platform/kernel';
import { TenantShard } from '../../../shared/utils/tenant-shard.js';
import { MemberRoster } from '../domain/member-roster.js';

/** Lleva la lista de miembros del tenant: su conteo de hoy es el uso de usuarios (ver `LocalUsageFacade`). */
@Injectable()
export class TrackMembership {
  constructor(
    private readonly roster: MemberRoster,
    private readonly shard: TenantShard,
    private readonly transactions: TransactionManager,
  ) {}

  execute(change: MembershipChangedPayload): Promise<void> {
    if (change.kind === MembershipChangeKind.GroupsChanged) {
      return Promise.resolve();
    }
    return this.shard.run(change.tenantId, () =>
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
