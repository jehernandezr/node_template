import { SagaStatus } from '@platform/saga';
import type { DataSource } from 'typeorm';
import { TenantMoveActivity } from '../application/tenant-move-activity.js';

/**
 * Las sagas del tenant que siguen corriendo, esperan un reintento o compensan en el shard. Su bitácora viaja con el
 * tenant, pero una saga a medias seguiría escribiendo en el origen después de la última ronda.
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
