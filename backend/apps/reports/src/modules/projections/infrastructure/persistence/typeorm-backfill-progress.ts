import { Injectable } from '@nestjs/common';
import { IdGenerator } from '@platform/kernel';
import { RepositoryKit, TenantIsolatedRepository } from '@platform/persistence';
import {
  BackfillProgress,
  type Backfill,
  type BackfillSource,
} from '../../domain/backfill-progress.js';
import { ProjectionBackfillEntity } from './entities/projection-backfill.entity.js';

/** `BackfillProgress` over `proj_backfills` in the tenant's shard, one row per source. */
@Injectable()
export class TypeOrmBackfillProgress
  extends TenantIsolatedRepository
  implements BackfillProgress
{
  constructor(
    kit: RepositoryKit,
    private readonly ids: IdGenerator,
  ) {
    super(kit);
  }

  async find(source: BackfillSource): Promise<Backfill> {
    const tenantId = this.tenantId();
    const row = await this.readPrimary((manager) =>
      manager.findOneBy(ProjectionBackfillEntity, { tenantId, source }),
    );
    return row === null
      ? { completed: false }
      : {
          completed: row.completed,
          ...(row.cursor === null ? {} : { cursor: row.cursor }),
        };
  }

  async save(source: BackfillSource, backfill: Backfill): Promise<void> {
    const tenantId = this.tenantId();
    await this.write((manager) =>
      manager.query(
        `INSERT INTO "proj_backfills" ("id", "tenant_id", "source", "cursor", "completed", "version") VALUES ($1, $2, $3, $4, $5, 1) ON CONFLICT ("tenant_id", "source") DO UPDATE SET "cursor" = EXCLUDED."cursor", "completed" = EXCLUDED."completed", "version" = "proj_backfills"."version" + 1, "updated_at" = now()`,
        [
          this.ids.next().toString(),
          tenantId,
          source,
          backfill.cursor ?? null,
          backfill.completed,
        ],
      ),
    );
  }
}
