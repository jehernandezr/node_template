import { Module, type Type } from '@nestjs/common';
import { AccessProjectionConsumer } from './access-projection.consumer.js';
import { AuthStateConsumer } from './auth-state.consumer.js';
import { BillingStandingConsumer } from './billing-standing.consumer.js';

/** Message consumers of identity. They use the facades of the modules, as any other client. */
export const IDENTITY_CONSUMERS: readonly Type<unknown>[] = [
  AccessProjectionConsumer,
  AuthStateConsumer,
  BillingStandingConsumer,
];

@Module({ providers: [...IDENTITY_CONSUMERS] })
export class IdentityConsumersModule {}
