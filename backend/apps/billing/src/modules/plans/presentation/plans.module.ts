import { Module } from '@nestjs/common';
import { PersistenceModule } from '@platform/persistence/nest';
import { LocalPlansFacade } from '../application/local-plans.facade.js';
import { PlansFacade } from '../application/plans.facade.js';
import { SeedPlans } from '../application/seed-plans.use-case.js';
import { PlanCatalog } from '../domain/plan-catalog.js';
import { PlanQuotaEntity } from '../infrastructure/persistence/entities/plan-quota.entity.js';
import { PlanEntity } from '../infrastructure/persistence/entities/plan.entity.js';
import { TypeOrmPlanCatalog } from '../infrastructure/persistence/typeorm-plan-catalog.js';
import { PlansController } from './plans.controller.js';

/** Plan catalog and its seed. */
@Module({
  imports: [
    PersistenceModule.forFeature({
      catalog: true,
      entities: [PlanEntity, PlanQuotaEntity],
    }),
  ],
  controllers: [PlansController],
  providers: [
    { provide: PlanCatalog, useClass: TypeOrmPlanCatalog },
    { provide: PlansFacade, useClass: LocalPlansFacade },
    SeedPlans,
  ],
  exports: [PlansFacade, SeedPlans],
})
export class PlansModule {}
