import { Injectable } from '@nestjs/common';
import { UsageMetric } from '@contracts/billing';
import { IdGenerator } from '@platform/kernel';
import { RepositoryKit, TenantIsolatedRepository } from '@platform/persistence';
import { UsageAggregations } from '../../domain/usage-aggregations.js';
import {
  UsageLedger,
  type MeteredUsage,
  type UsageLevel,
} from '../../domain/usage-ledger.js';
import { UsageRecordEntity } from './entities/usage-record.entity.js';
import { UsageTotalEntity } from './entities/usage-total.entity.js';

/** `UsageLedger` sobre `usage_records` y `usage_totals` del shard del tenant. */
@Injectable()
export class TypeOrmUsageLedger
  extends TenantIsolatedRepository
  implements UsageLedger
{
  constructor(
    kit: RepositoryKit,
    private readonly ids: IdGenerator,
  ) {
    super(kit);
  }

  async claim(usage: MeteredUsage): Promise<boolean> {
    const tenantId = this.tenantId();
    const result = await this.write((manager) =>
      manager
        .createQueryBuilder()
        .insert()
        .into(UsageRecordEntity)
        .values({
          id: usage.id,
          tenantId,
          key: usage.key,
          metric: usage.metric,
          quantity: String(usage.quantity),
          windowStart: usage.windowStart,
        })
        .orIgnore()
        .returning(['id'])
        .execute(),
    );
    return result.raw.length > 0;
  }

  async accumulate(
    day: string,
    metric: UsageMetric,
    quantity: number,
  ): Promise<void> {
    const tenantId = this.tenantId();
    const merge = UsageAggregations.isSum(metric)
      ? '"usage_totals"."quantity" + EXCLUDED."quantity"'
      : 'GREATEST("usage_totals"."quantity", EXCLUDED."quantity")';
    await this.write((manager) =>
      manager.query(
        `INSERT INTO "usage_totals" ("id", "tenant_id", "day", "metric", "quantity", "version") VALUES ($1, $2, $3, $4, $5, 1) ON CONFLICT ("tenant_id", "day", "metric") DO UPDATE SET "quantity" = ${merge}, "version" = "usage_totals"."version" + 1, "updated_at" = now()`,
        [this.ids.next().toString(), tenantId, day, metric, quantity],
      ),
    );
  }

  async levels(from: string, to: string): Promise<readonly UsageLevel[]> {
    const tenantId = this.tenantId();
    const rows = await this.read((manager) =>
      manager
        .createQueryBuilder(UsageTotalEntity, 'total')
        .select('total.metric', 'metric')
        .addSelect('SUM(total.quantity)', 'sum')
        .addSelect('MAX(total.quantity)', 'max')
        .where('total.tenantId = :tenantId', { tenantId })
        .andWhere('total.day BETWEEN :from AND :to', { from, to })
        .groupBy('total.metric')
        .getRawMany<{ metric: UsageMetric; sum: string; max: string }>(),
    );
    return rows.map((row) => ({
      metric: row.metric,
      used: Number(UsageAggregations.isSum(row.metric) ? row.sum : row.max),
    }));
  }
}
