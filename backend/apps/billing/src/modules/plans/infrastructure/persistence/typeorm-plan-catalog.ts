import { Injectable } from '@nestjs/common';
import type {
  Currency,
  PlanPeriodicity,
  UsageMetric,
} from '@contracts/billing';
import type { PlanFeature } from '@contracts/identity';
import { CatalogDataSource } from '@platform/persistence';
import { In, type EntityManager } from 'typeorm';
import { PlanCatalog } from '../../domain/plan-catalog.js';
import { Plan, type PlanState } from '../../domain/plan.js';
import { PlanQuotaEntity } from './entities/plan-quota.entity.js';
import { PlanEntity } from './entities/plan.entity.js';

/** `PlanCatalog` sobre `billing_plans` y `billing_plan_quotas` del catálogo, siempre en el primario. */
@Injectable()
export class TypeOrmPlanCatalog extends PlanCatalog {
  constructor(private readonly catalog: CatalogDataSource) {
    super();
  }

  async available(): Promise<readonly Plan[]> {
    return this.run(async (manager) =>
      this.withQuotas(
        manager,
        await manager.find(PlanEntity, { order: { priceMinor: 'ASC' } }),
      ),
    );
  }

  async find(planId: string): Promise<Plan | undefined> {
    return this.run(async (manager) => {
      const rows = await manager.findBy(PlanEntity, { id: planId });
      return (await this.withQuotas(manager, rows))[0];
    });
  }

  async findByCode(code: string): Promise<Plan | undefined> {
    return this.run(async (manager) => {
      const rows = await manager.findBy(PlanEntity, { code });
      return (await this.withQuotas(manager, rows))[0];
    });
  }

  async save(plan: Omit<PlanState, 'id'>, newId: string): Promise<Plan> {
    const dataSource = await this.catalog.get();
    return dataSource.transaction(async (manager) => {
      const existing = await manager.findOneBy(PlanEntity, { code: plan.code });
      const id = existing?.id ?? newId;
      const row = Object.assign(existing ?? new PlanEntity(), {
        id,
        code: plan.code,
        name: plan.name,
        priceMinor: String(plan.priceMinor),
        currency: plan.currency,
        periodicity: plan.periodicity,
        features: [...plan.features],
      });
      await manager.save(PlanEntity, row);
      await manager.delete(PlanQuotaEntity, { planId: id });
      await manager.insert(
        PlanQuotaEntity,
        plan.quotas.map((quota) => ({
          planId: id,
          metric: quota.metric,
          limit: String(quota.limit),
          unitPriceMinor:
            quota.unitPriceMinor === undefined
              ? null
              : String(quota.unitPriceMinor),
        })),
      );
      return Plan.of({ ...plan, id });
    });
  }

  private async withQuotas(
    manager: EntityManager,
    rows: readonly PlanEntity[],
  ): Promise<Plan[]> {
    const quotas =
      rows.length === 0
        ? []
        : await manager.findBy(PlanQuotaEntity, {
            planId: In(rows.map((row) => row.id)),
          });
    return rows.map((row) =>
      Plan.of({
        id: row.id,
        code: row.code,
        name: row.name,
        priceMinor: Number(row.priceMinor),
        currency: row.currency as Currency,
        periodicity: row.periodicity as PlanPeriodicity,
        features: row.features as PlanFeature[],
        quotas: quotas
          .filter((quota) => quota.planId === row.id)
          .map((quota) => ({
            metric: quota.metric as UsageMetric,
            limit: Number(quota.limit),
            ...(quota.unitPriceMinor === null
              ? {}
              : { unitPriceMinor: Number(quota.unitPriceMinor) }),
          })),
      }),
    );
  }

  private async run<T>(fn: (manager: EntityManager) => Promise<T>): Promise<T> {
    const dataSource = await this.catalog.get();
    const runner = dataSource.createQueryRunner('master');
    try {
      return await fn(runner.manager);
    } finally {
      await runner.release();
    }
  }
}
