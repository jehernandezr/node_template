import { Global, Module } from '@nestjs/common';
import { PersistenceModule } from '@platform/persistence/nest';
import { ShardKey } from '@platform/sharding';
import { TenantShard } from '../../../shared/utils/tenant-shard.js';
import { AdvanceDunningJob } from '../application/advance-dunning.job.js';
import { ChangePlan } from '../application/change-plan.use-case.js';
import { CloseSubscriptionPeriod } from '../application/close-subscription-period.use-case.js';
import { LocalSubscriptionsFacade } from '../application/local-subscriptions.facade.js';
import { OpenSubscription } from '../application/open-subscription.use-case.js';
import { SubscriptionEvents } from '../application/subscription-events.js';
import { SubscriptionStanding } from '../application/subscription-standing.js';
import { SubscriptionsFacade } from '../application/subscriptions.facade.js';
import { SubscriptionMaintenance } from '../domain/subscription-maintenance.js';
import { SubscriptionRepository } from '../domain/subscription.repository.js';
import { SubscriptionEntity } from '../infrastructure/persistence/entities/subscription.entity.js';
import { TypeOrmSubscriptionMaintenance } from '../infrastructure/persistence/typeorm-subscription-maintenance.js';
import { TypeOrmSubscriptionRepository } from '../infrastructure/persistence/typeorm-subscription.repository.js';
import { SubscriptionsController } from './subscriptions.controller.js';

/** Suscripción de cada tenant: plan, periodos, prorrateo y morosidad. Global solo para su fachada. */
@Global()
@Module({
  imports: [
    PersistenceModule.forFeature({
      entities: [SubscriptionEntity],
      sharding: { key: ShardKey.Tenant },
    }),
  ],
  controllers: [SubscriptionsController],
  providers: [
    TenantShard,
    {
      provide: SubscriptionRepository,
      useClass: TypeOrmSubscriptionRepository,
    },
    {
      provide: SubscriptionMaintenance,
      useClass: TypeOrmSubscriptionMaintenance,
    },
    SubscriptionEvents,
    OpenSubscription,
    ChangePlan,
    CloseSubscriptionPeriod,
    SubscriptionStanding,
    AdvanceDunningJob,
    { provide: SubscriptionsFacade, useClass: LocalSubscriptionsFacade },
  ],
  exports: [SubscriptionsFacade],
})
export class SubscriptionsModule {}
