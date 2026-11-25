import { Injectable } from '@nestjs/common';
import {
  AcrossShards,
  TenantMaintenanceSession,
  TenantWriteFence,
} from '@platform/persistence';
import { ShardsUnavailableError } from '../../../../shared/errors/shards-unavailable.error.js';
import { MemberTombstones } from '../../domain/member-tombstones.js';

/**
 * `MemberTombstones` over the soft-deleted rows of `tenant_members`, one maintenance transaction per shard. Rows
 * of tenants that already moved to another shard are left to that shard.
 */
@Injectable()
export class TypeOrmMemberTombstones extends MemberTombstones {
  constructor(private readonly shards: AcrossShards) {
    super();
  }

  /** {@inheritDoc MemberTombstones.forget} */
  async forget(userId: string): Promise<void> {
    const outcome = await this.shards.run((connection) =>
      TenantMaintenanceSession.run(connection.dataSource.manager, (manager) =>
        manager.query(
          `DELETE FROM "tenant_members" WHERE "user_id" = $1 AND "deleted_at" IS NOT NULL AND ${TenantWriteFence.unfenced('"tenant_members"."tenant_id"')}`,
          [userId],
        ),
      ),
    );
    TenantMaintenanceSession.requireEveryShard(outcome);
    if (outcome.partial) {
      throw new ShardsUnavailableError(
        'Member tombstone erasure',
        outcome.failures.map((failure) => failure.shard),
      );
    }
  }
}
