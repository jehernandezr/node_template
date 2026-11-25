import { SagaStatus } from '@platform/saga';
import type { DataSource } from 'typeorm';
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

  async openWork(shard: DataSource, tenantId: string): Promise<number> {
    const rows: { open: string }[] = await shard.query(
      'SELECT count(*)::text AS open FROM "saga"."instances" WHERE "tenant_id"::text = $1 AND "status" = ANY($2::text[])',
      [tenantId, [...OpenSagaActivity.OPEN]],
    );
    return Number(rows[0]?.open ?? 0);
  }
}
