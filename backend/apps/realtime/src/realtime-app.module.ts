import { Global, Module, type DynamicModule } from '@nestjs/common';
import {
  ValkeyAuthRevocationFeed,
  ValkeyAuthStateReader,
  ValkeyPresenceTracker,
  ValkeyRealtimeStream,
} from '@platform/adapters-valkey';
import {
  ValkeyModule,
  ValkeyRealtimeModule,
} from '@platform/adapters-valkey/nest';
import { AuthModule } from '@platform/auth/nest';
import type { ConfigEnv } from '@platform/config';
import { ConfigModule } from '@platform/config/nest';
import { ObservabilityModule } from '@platform/observability/nest';
import { RealtimeModule } from '@platform/realtime/nest';
import { HealthEndpoints, PlatformKernelModule } from '@platform/service/nest';
import { SharedStateAccessGrantSource } from './auth/shared-state-access-grant-source.js';
import { realtimeAppConfigSchema } from './config/realtime-app.config.js';

@Global()
@Module({
  providers: [SharedStateAccessGrantSource],
  exports: [SharedStateAccessGrantSource],
})
class RealtimeAuthSourceModule {}

/** The `apps/realtime` process: verifies tokens, reads each user's stream and serves SSE and Socket.IO. */
@Module({})
export class RealtimeAppModule {
  static forEnv(env: ConfigEnv): DynamicModule {
    return {
      module: RealtimeAppModule,
      imports: [
        PlatformKernelModule,
        ConfigModule.forRoot({ schema: realtimeAppConfigSchema, env }),
        ObservabilityModule.forRoot({}),
        ValkeyModule.forRoot({ connectionName: 'realtime' }),
        ValkeyRealtimeModule,
        RealtimeAuthSourceModule,
        AuthModule.forRoot({
          source: ValkeyAuthStateReader,
          feed: ValkeyAuthRevocationFeed,
          accessGrants: SharedStateAccessGrantSource,
        }),
        RealtimeModule.forRoot({
          ssePath: realtimeAppConfigSchema.shape.REALTIME_SSE_PATH.parse(
            env['REALTIME_SSE_PATH'],
          ),
          socketNamespace:
            realtimeAppConfigSchema.shape.REALTIME_SOCKET_NAMESPACE.parse(
              env['REALTIME_SOCKET_NAMESPACE'],
            ),
          stream: ValkeyRealtimeStream,
          presence: ValkeyPresenceTracker,
          serveConnections: () => true,
        }),
      ],
      controllers: [HealthEndpoints],
    };
  }
}
