import { Injectable } from '@nestjs/common';
import type { TaskStatus } from '@contracts/tasks';
import { IdGenerator } from '@platform/kernel';
import { RepositoryKit, TenantIsolatedRepository } from '@platform/persistence';
import type {
  ActivityPoint,
  StatusCount,
} from '../../domain/projection-points.js';
import type { BucketedRange, ReportRange } from '../../domain/report-range.js';
import {
  TaskProjection,
  type TaskProjectionChange,
} from '../../domain/task-projection.js';

/**
 * `TaskProjection` sobre `proj_tasks`. Cada columna se decide por la versión: el estado y la fecha de cierre
 * los pone el cambio más nuevo, y las fechas de creación y de borrado se conservan una vez conocidas.
 */
@Injectable()
export class TypeOrmTaskProjection
  extends TenantIsolatedRepository
  implements TaskProjection
{
  private static readonly UPSERT = `INSERT INTO "proj_tasks" AS p ("id", "tenant_id", "task_id", "status", "task_created_at", "done_at", "removed_at", "source_version", "version")
    VALUES ($1, $2, $3, $4, $5, CASE WHEN $9 THEN $6::timestamptz END, $7, $8, 1)
    ON CONFLICT ("tenant_id", "task_id") DO UPDATE SET
      "status" = CASE WHEN p."source_version" < EXCLUDED."source_version" THEN EXCLUDED."status" ELSE p."status" END,
      "done_at" = CASE WHEN p."source_version" < EXCLUDED."source_version" THEN (CASE WHEN $9 THEN COALESCE(EXCLUDED."done_at", p."done_at") END) ELSE p."done_at" END,
      "task_created_at" = COALESCE(p."task_created_at", EXCLUDED."task_created_at"),
      "removed_at" = COALESCE(p."removed_at", EXCLUDED."removed_at"),
      "source_version" = GREATEST(p."source_version", EXCLUDED."source_version"),
      "version" = p."version" + 1,
      "updated_at" = now()`;

  constructor(
    kit: RepositoryKit,
    private readonly ids: IdGenerator,
  ) {
    super(kit);
  }

  async apply(change: TaskProjectionChange): Promise<void> {
    const tenantId = this.tenantId();
    await this.write((manager) =>
      manager.query(TypeOrmTaskProjection.UPSERT, [
        this.ids.next().toString(),
        tenantId,
        change.taskId,
        change.status,
        change.createdAt ?? null,
        change.doneAt ?? null,
        change.removedAt ?? null,
        change.version,
        change.done,
      ]),
    );
  }

  async statusCounts(range: ReportRange): Promise<readonly StatusCount[]> {
    const tenantId = this.tenantId();
    const rows: { status: TaskStatus; count: string }[] = await this.read(
      (manager) =>
        manager.query(
          `SELECT "status", count(*) AS "count" FROM "proj_tasks" WHERE "tenant_id" = $1 AND "removed_at" IS NULL AND "task_created_at" >= $2::date AND "task_created_at" < $3::date + 1 GROUP BY "status" ORDER BY "status"`,
          [tenantId, range.from, range.to],
        ),
    );
    return rows.map((row) => ({
      status: row.status,
      count: Number(row.count),
    }));
  }

  async activity(range: BucketedRange): Promise<readonly ActivityPoint[]> {
    const tenantId = this.tenantId();
    const rows: { period: string; created: string; completed: string }[] =
      await this.read((manager) =>
        manager.query(
          `WITH events AS (
             SELECT "task_created_at" AS "at", 1 AS "created", 0 AS "completed" FROM "proj_tasks" WHERE "tenant_id" = $1 AND "task_created_at" IS NOT NULL
             UNION ALL
             SELECT "done_at", 0, 1 FROM "proj_tasks" WHERE "tenant_id" = $1 AND "done_at" IS NOT NULL
           )
           SELECT to_char(date_trunc($4, "at" AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS "period", sum("created") AS "created", sum("completed") AS "completed"
           FROM events WHERE "at" >= $2::date AND "at" < $3::date + 1 GROUP BY 1 ORDER BY 1`,
          [tenantId, range.from, range.to, range.granularity],
        ),
      );
    return rows.map((row) => ({
      period: row.period,
      created: Number(row.created),
      completed: Number(row.completed),
    }));
  }
}
