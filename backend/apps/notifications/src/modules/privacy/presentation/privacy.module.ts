import { Module } from '@nestjs/common';
import { PrivacyInternalOperations } from './privacy.internal-operations.js';
import { DispatchModule } from '../../dispatch/module.js';
import { InboxModule } from '../../inbox/module.js';
import { PreferencesModule } from '../../preferences/module.js';

/** Operations over all of a user's data. */
@Module({
  imports: [DispatchModule, InboxModule, PreferencesModule],
  providers: [PrivacyInternalOperations],
})
export class PrivacyModule {}
