import { Module } from '@nestjs/common';
import { EntitlementQueries } from '../application/entitlement-queries.js';
import { EntitlementsInternalOperations } from './entitlements.internal-operations.js';
import { UsageController } from './usage.controller.js';

/** Entitlements, quotas and period usage against the plan limits. */
@Module({
  controllers: [UsageController],
  providers: [EntitlementQueries, EntitlementsInternalOperations],
})
export class EntitlementsModule {}
