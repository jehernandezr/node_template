import { Module } from '@nestjs/common';
import { EntitlementQueries } from '../application/entitlement-queries.js';
import { EntitlementsInternalOperations } from './entitlements.internal-operations.js';
import { UsageController } from './usage.controller.js';
import { SubscriptionsModule } from '../../subscriptions/module.js';
import { UsageModule } from '../../usage/module.js';

/** Entitlements, quotas and period usage against the plan limits. */
@Module({
  imports: [SubscriptionsModule, UsageModule],
  controllers: [UsageController],
  providers: [EntitlementQueries, EntitlementsInternalOperations],
})
export class EntitlementsModule {}
