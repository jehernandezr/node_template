import { Module } from '@nestjs/common';
import { ValkeyUsageCounterStore } from '@platform/adapters-valkey';
import { ValkeyMeteringModule } from '@platform/adapters-valkey/nest';
import { notificationsContract } from '@contracts/notifications';
import { HttpModule } from '@platform/http/nest';
import { MeteringModule } from '@platform/metering/nest';
import { RemoteIdentityAuthModule } from '@platform/service/nest';
import { NOTIFICATIONS_ERROR_CATALOGS } from './shared/constants/notifications-error-catalogs.constants.js';
import { DispatchModule } from './modules/dispatch/presentation/dispatch.module.js';
import { EmailModule } from './modules/email/presentation/email.module.js';
import { InboxModule } from './modules/inbox/presentation/inbox.module.js';
import { PreferencesModule } from './modules/preferences/presentation/preferences.module.js';
import { PrivacyModule } from './modules/privacy/presentation/privacy.module.js';
import { PushModule } from './modules/push/presentation/push.module.js';
import { NotificationsRealtimeModule } from './modules/realtime/presentation/notifications-realtime.module.js';
import { TriggersModule } from './modules/triggers/presentation/triggers.module.js';

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
  ],
})
export class AppModule {}
