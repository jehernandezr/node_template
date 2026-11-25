import { Module } from '@nestjs/common';
import { ValkeyUsageCounterStore } from '@platform/adapters-valkey';
import { ValkeyMeteringModule } from '@platform/adapters-valkey/nest';
import {
  notificationsContract,
  NotificationsTenantDirectoryOperations,
  NotificationsTenantMoveOperations,
} from '@contracts/notifications';
import { HttpModule } from '@platform/http/nest';
import { MeteringModule } from '@platform/metering/nest';
import { RemoteIdentityAuthModule } from '@platform/service/nest';
import {
  TenantDirectoryModule,
  TenantMoveModule,
} from '@platform/tenant-move/nest';
import { NotificationsTenantMoveManifest } from './database/notifications-tenant-move.manifest.js';
import { NOTIFICATIONS_ERROR_CATALOGS } from './shared/constants/notifications-error-catalogs.constants.js';
import { DispatchModule } from './modules/dispatch/presentation/dispatch.module.js';
import { EmailModule } from './modules/email/presentation/email.module.js';
import { InboxModule } from './modules/inbox/presentation/inbox.module.js';
import { PreferencesModule } from './modules/preferences/presentation/preferences.module.js';
import { PrivacyModule } from './modules/privacy/presentation/privacy.module.js';
import { PushModule } from './modules/push/presentation/push.module.js';
import { NotificationsRealtimeModule } from './modules/realtime/presentation/notifications-realtime.module.js';
import { TriggersModule } from './modules/triggers/presentation/triggers.module.js';
// generated:modules:imports

@Module({
  imports: [
    RemoteIdentityAuthModule,
    HttpModule.forRoot({
      contract: notificationsContract,
      catalogs: NOTIFICATIONS_ERROR_CATALOGS,
    }),
    ValkeyMeteringModule,
    MeteringModule.forRoot({
      service: notificationsContract.service,
      counters: ValkeyUsageCounterStore,
    }),
    NotificationsRealtimeModule,
    PreferencesModule,
    InboxModule,
    EmailModule,
    PushModule,
    DispatchModule,
    TriggersModule,
    PrivacyModule,
    TenantMoveModule.forFeature({
      operations: NotificationsTenantMoveOperations,
      manifest: NotificationsTenantMoveManifest,
    }),
    TenantDirectoryModule.forFeature({
      service: notificationsContract.service,
      operations: NotificationsTenantDirectoryOperations,
    }),
    // generated:modules
  ],
})
export class AppModule {}
