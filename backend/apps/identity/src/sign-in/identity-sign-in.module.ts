import { Global, Module } from '@nestjs/common';
import { DeploymentRegion } from './deployment-region.js';
import { SessionDelivery } from './session-delivery.js';

/** Session delivery and deployment region, shared by the sign-in flows of the identity modules. */
@Global()
@Module({
  providers: [SessionDelivery, DeploymentRegion],
  exports: [SessionDelivery, DeploymentRegion],
})
export class IdentitySignInModule {}
