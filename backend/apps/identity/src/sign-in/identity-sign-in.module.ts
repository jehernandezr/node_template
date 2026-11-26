import { Global, Module } from '@nestjs/common';
import { DeploymentRegion } from './utils/deployment-region.js';
import { SessionDelivery } from './utils/session-delivery.js';

/** Services shared by all identity modules. */
@Global()
@Module({
  providers: [SessionDelivery, DeploymentRegion],
  exports: [SessionDelivery, DeploymentRegion],
})
export class IdentitySharedModule {}
