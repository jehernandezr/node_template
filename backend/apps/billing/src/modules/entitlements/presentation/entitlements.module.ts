import { Module } from '@nestjs/common';
import { EntitlementQueries } from '../application/entitlement-queries.js';
import { EntitlementsInternalOperations } from './entitlements.internal-operations.js';
import { UsageController } from './usage.controller.js';

/** Entitlements, cuotas y el uso del periodo frente a los límites del plan. */
@Module({
  controllers: [UsageController],
  providers: [EntitlementQueries, EntitlementsInternalOperations],
})
export class EntitlementsModule {}
