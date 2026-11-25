import { SagaStatus } from '@platform/saga';
import type { ShardLocation } from '@platform/persistence';
import type { ShardConnections } from '../transfer/shard-connections.js';
import { TenantMoveActivity } from '../application/tenant-move-activity.js';

/**
 * The tenant sagas that are still running, waiting for a retry or compensating on the shard. Their log travels with the
 * tenant, but a half-finished saga would keep writing to the source after the last round.
 */
export class OpenSagaActivity extends TenantMoveActivity {
  private static readonly OPEN: readonly SagaStatus[] = [
    SagaStatus.Running,
    SagaStatus.Suspended,
    SagaStatus.Compensating,
  ];

  constructor(private readonly connections: ShardConnections) {
    super();
  }

  /** How many sagas of the tenant are running, suspended or compensating on the shard. */
  async openWork(shard: ShardLocation, tenantId: string): Promise<number> {
    const dataSource = await this.connections.get(shard);
    const rows: { open: string }[] = await dataSource.query(
      'SELECT count(*)::text AS open FROM "saga"."instances" WHERE "tenant_id"::text = $1 AND "status" = ANY($2::text[])',
      [tenantId, [...OpenSagaActivity.OPEN]],
    );
    return Number(rows[0]?.open ?? 0);
  }
}
