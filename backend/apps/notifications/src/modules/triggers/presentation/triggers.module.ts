import { Module } from '@nestjs/common';
import { TenantMembers } from '../application/tenant-members.js';
import { TriggerNotifications } from '../application/trigger-notifications.js';
import { IdentityTenantMembers } from '../infrastructure/identity-tenant-members.js';
import { RealtimeControlConsumer } from './realtime-control.consumer.js';
import { TriggersConsumer } from './triggers.consumer.js';

/** Consumidores que convierten eventos de otros servicios en avisos y cierran conexiones revocadas. */
@Module({
  providers: [
    { provide: TenantMembers, useClass: IdentityTenantMembers },
    TriggerNotifications,
    TriggersConsumer,
    RealtimeControlConsumer,
  ],
})
export class TriggersModule {}
