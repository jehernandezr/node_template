import { Global, Module } from '@nestjs/common';
import type { AppConfig } from '@platform/config';
import {
  ValkeyPresenceTracker,
  ValkeyRealtimeStream,
} from '@platform/adapters-valkey';
import { ValkeyRealtimeModule } from '@platform/adapters-valkey/nest';
import { RealtimeModule } from '@platform/realtime/nest';
import type { NotificationsConfig } from '../../../config/notifications.config.js';
import { RealtimeHost } from '../../../shared/enums/realtime-host.enum.js';
import { RealtimeFacade } from '../application/realtime.facade.js';
import { StreamRealtimeFacade } from '../application/stream-realtime.facade.js';

/** Streaming routes: SSE outside the contract, like `/health`, and the Socket.IO namespace. */
export const NotificationsStreamEndpoints = {
  ssePath: '/v1/notifications/stream',
  socketNamespace: '/notifications',
} as const;

/**
 * Real time for notifications. With `REALTIME_HOST=service` the API process also serves the
 * connections; with `app` it only publishes to the stream and `apps/realtime` serves them.
 */
@Global()
@Module({
  imports: [
    ValkeyRealtimeModule,
    RealtimeModule.forRoot({
      ...NotificationsStreamEndpoints,
      stream: ValkeyRealtimeStream,
      presence: ValkeyPresenceTracker,
      serveConnections: (config: AppConfig) =>
        config.root<NotificationsConfig>().REALTIME_HOST ===
        RealtimeHost.Service,
    }),
  ],
  providers: [{ provide: RealtimeFacade, useClass: StreamRealtimeFacade }],
  exports: [RealtimeFacade],
})
export class NotificationsRealtimeModule {}
