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

/** Rutas de la transmisión: SSE fuera del contrato, como `/health`, y el namespace de Socket.IO. */
export const NotificationsStreamEndpoints = {
  ssePath: '/v1/notifications/stream',
  socketNamespace: '/notifications',
} as const;

/**
 * Tiempo real de las notificaciones. Con `REALTIME_HOST=service` el proceso de la API también atiende las
 * conexiones; con `app` solo publica en el stream y `apps/realtime` las atiende.
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
