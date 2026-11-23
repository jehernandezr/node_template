import { Global, Module } from '@nestjs/common';
import { Clock } from '@platform/kernel';
import { ConfigModule } from '@platform/config/nest';
import { RealtimeConfig, type RealtimeSettings } from '@platform/realtime';
import { ValkeyPresenceTracker } from '../realtime/valkey-presence-tracker.js';
import { ValkeyRealtimeStream } from '../realtime/valkey-realtime-stream.js';
import { ValkeyCommandExecutor } from '../valkey-command-executor.js';
import { ValkeyKeyspace } from '../valkey-keyspace.js';
import { ValkeySubscriberSource } from '../valkey-subscriber-source.js';

/**
 * Stream y presencia de tiempo real sobre el cliente de `ValkeyModule`. Va aparte para que solo el servicio
 * con tiempo real valide `REALTIME_*`. Es global porque `RealtimeModule` los toma por su clase.
 */
@Global()
@Module({
  imports: [ConfigModule.forFeature(RealtimeConfig)],
  providers: [
    {
      provide: ValkeyRealtimeStream,
      useFactory: (
        executor: ValkeyCommandExecutor,
        subscribers: ValkeySubscriberSource,
        keyspace: ValkeyKeyspace,
        realtime: RealtimeSettings,
      ) =>
        new ValkeyRealtimeStream(executor, subscribers, keyspace, {
          retained: realtime.REALTIME_STREAM_RETAINED,
          ttlMs: realtime.REALTIME_STREAM_TTL,
        }),
      inject: [
        ValkeyCommandExecutor,
        ValkeySubscriberSource,
        ValkeyKeyspace,
        RealtimeConfig.token,
      ],
    },
    {
      provide: ValkeyPresenceTracker,
      useFactory: (
        executor: ValkeyCommandExecutor,
        keyspace: ValkeyKeyspace,
        clock: Clock,
      ) => new ValkeyPresenceTracker(executor, keyspace, clock),
      inject: [ValkeyCommandExecutor, ValkeyKeyspace, Clock],
    },
  ],
  exports: [ValkeyRealtimeStream, ValkeyPresenceTracker],
})
export class ValkeyRealtimeModule {}
