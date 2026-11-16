import { Module, type Type } from '@nestjs/common';

/** Consumidores de mensajes de identity. Cada módulo de negocio agrega el suyo cuando lo necesita. */
export const IDENTITY_CONSUMERS: readonly Type<unknown>[] = [];

@Module({ providers: [...IDENTITY_CONSUMERS] })
export class IdentityConsumersModule {}
