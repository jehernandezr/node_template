import { Module } from '@nestjs/common';
import { TenantsController } from './tenants.controller.js';
import { TenantsInternalOperations } from './tenants.internal-operations.js';

@Module({
  controllers: [TenantsController],
  providers: [TenantsInternalOperations],
})
export class TenantsModule {}
