import { Module, type Type } from '@nestjs/common';
import { AccessProjectionConsumer } from './access-projection.consumer.js';
import { AuthStateConsumer } from './auth-state.consumer.js';
import { AccessCoreModule } from '../modules/access/module.js';
import { SessionsModule } from '../modules/sessions/module.js';
import { UsersCoreModule } from '../modules/users/module.js';

/** Message consumers of identity. They use the facades of the modules, as any other client. */
export const IDENTITY_CONSUMERS: readonly Type<unknown>[] = [
  AccessProjectionConsumer,
  AuthStateConsumer,
];

/** Identity's message consumers with the modules whose facades they call. */
@Module({
  imports: [AccessCoreModule, SessionsModule, UsersCoreModule],
  providers: [...IDENTITY_CONSUMERS],
})
export class IdentityConsumersModule {}
