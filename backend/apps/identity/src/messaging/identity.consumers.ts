import { Module, type Type } from '@nestjs/common';
import { AccessProjectionConsumer } from './access-projection.consumer.js';
import { BillingStandingConsumer } from './billing-standing.consumer.js';

/** Consumidores de mensajes de identity. Usan las fachadas de los módulos, como cualquier otro cliente. */
export const IDENTITY_CONSUMERS: readonly Type<unknown>[] = [
  AccessProjectionConsumer,
  BillingStandingConsumer,
];

@Module({ providers: [...IDENTITY_CONSUMERS] })
export class IdentityConsumersModule {}
