import { Module } from '@nestjs/common';
import { PersistenceModule } from '@platform/persistence/nest';
import { ShardKey } from '@platform/sharding';
import { LocalUsageFacade } from '../application/local-usage.facade.js';
import { RecordUsage } from '../application/record-usage.use-case.js';
import { TrackMembership } from '../application/track-membership.use-case.js';
import { UsageFacade } from '../application/usage.facade.js';
import { MemberRoster } from '../domain/member-roster.js';
import { UsageLedger } from '../domain/usage-ledger.js';
import { BillingMemberEntity } from '../infrastructure/persistence/entities/billing-member.entity.js';
import { UsageRecordEntity } from '../infrastructure/persistence/entities/usage-record.entity.js';
import { UsageTotalEntity } from '../infrastructure/persistence/entities/usage-total.entity.js';
import { TypeOrmMemberRoster } from '../infrastructure/persistence/typeorm-member-roster.js';
import { TypeOrmUsageLedger } from '../infrastructure/persistence/typeorm-usage-ledger.js';
import { UsageConsumer } from './usage.consumer.js';

/** Metered usage of each tenant and its member count. */
@Module({
  imports: [
    PersistenceModule.forFeature({
      entities: [UsageRecordEntity, UsageTotalEntity, BillingMemberEntity],
      sharding: { key: ShardKey.Tenant },
    }),
  ],
  providers: [
    { provide: UsageLedger, useClass: TypeOrmUsageLedger },
    { provide: MemberRoster, useClass: TypeOrmMemberRoster },
    RecordUsage,
    TrackMembership,
    { provide: UsageFacade, useClass: LocalUsageFacade },
    UsageConsumer,
  ],
  exports: [UsageFacade],
})
export class UsageModule {}
