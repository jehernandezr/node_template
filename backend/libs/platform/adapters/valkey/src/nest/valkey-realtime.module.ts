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
 * Realtime stream and presence on the `ValkeyModule` client. It is separate so only the service
 * with realtime validates `REALTIME_*`. It is global because `RealtimeModule` takes them by their class.
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
