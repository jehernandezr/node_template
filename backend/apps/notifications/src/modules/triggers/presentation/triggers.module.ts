import { Module } from '@nestjs/common';
import { TenantMembers } from '../application/tenant-members.js';
import { TriggerNotifications } from '../application/trigger-notifications.js';
import { IdentityTenantMembers } from '../infrastructure/identity-tenant-members.js';
import { RealtimeControlConsumer } from './realtime-control.consumer.js';
import { TriggersConsumer } from './triggers.consumer.js';
import { DispatchModule } from '../../dispatch/module.js';
import { NotificationsRealtimeModule } from '../../realtime/module.js';

/** Consumers that turn events from other services into notices and close revoked connections. */
@Module({
  imports: [DispatchModule, NotificationsRealtimeModule],
  providers: [
    { provide: TenantMembers, useClass: IdentityTenantMembers },
    TriggerNotifications,
    TriggersConsumer,
    RealtimeControlConsumer,
  ],
})
export class TriggersModule {}
