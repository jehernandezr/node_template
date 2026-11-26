import { Module, type DynamicModule, type Provider } from '@nestjs/common';
import { AccessTokenVerifier, AuthStateReader } from '@platform/auth';
import { HttpConfig, type HttpSettings } from '@platform/http';
import { Clock, IdGenerator } from '@platform/kernel';
import { LoggerPort } from '@platform/observability';
import { AppConfig } from '@platform/config';
import { ConfigModule } from '@platform/config/nest';
import { AuthStateStreamRevocations } from '../auth/auth-state-stream-revocations.js';
import { InMemoryPresenceTracker } from '../presence/in-memory-presence-tracker.js';
import { PresenceTracker } from '../presence/presence-tracker.js';
import { RealtimeComponents } from '../realtime-components.js';
import { RealtimeConfig, type RealtimeSettings } from '../realtime.config.js';
import { RealtimePublisher } from '../realtime-publisher.js';
import { RealtimeConnections } from '../session/realtime-connections.js';
import { InMemoryRealtimeStream } from '../stream/in-memory-realtime-stream.js';
import { RealtimeStream } from '../stream/realtime-stream.js';
import type { RealtimeModuleOptions } from './realtime-module-options.js';
import { RealtimeLifecycle } from './realtime-lifecycle.js';
import { RealtimeTransports } from './realtime-transports.js';

/**
 * Realtime for a service: `RealtimePublisher` for whoever decides what to send and, with `serveConnections`,
 * the `REALTIME_TRANSPORTS` transports mounted on the process's HTTP server. Needs `AuthModule`
 * to verify the connections' tokens.
 */
@Module({})
export class RealtimeModule {
  /**
   * Registers the real-time transports, stream and presence with their adapters.
   * @param options Transports, endpoints and adapters.
   * @returns The module.
   */
  static forRoot(options: RealtimeModuleOptions): DynamicModule {
    return {
      module: RealtimeModule,
      global: true,
      imports: [
        ConfigModule.forFeature(RealtimeConfig),
        ConfigModule.forFeature(HttpConfig),
      ],
      providers: [
        RealtimeModule.storeProvider(RealtimeStream, options.stream, {
          useFactory: (settings: RealtimeSettings) =>
            new InMemoryRealtimeStream(settings.REALTIME_STREAM_RETAINED),
          inject: [RealtimeConfig.token],
        }),
        RealtimeModule.storeProvider(PresenceTracker, options.presence, {
          useFactory: (clock: Clock) => new InMemoryPresenceTracker(clock),
          inject: [Clock],
        }),
        {
          provide: RealtimePublisher,
          useFactory: (stream: RealtimeStream, presence: PresenceTracker) =>
            new RealtimePublisher(stream, presence),
          inject: [RealtimeStream, PresenceTracker],
        },
        {
          provide: RealtimeConnections,
          useFactory: (
            stream: RealtimeStream,
            presence: PresenceTracker,
            state: AuthStateReader,
            ids: IdGenerator,
            clock: Clock,
            logger: LoggerPort,
            settings: RealtimeSettings,
          ) =>
            new RealtimeConnections(
              stream,
              presence,
              new AuthStateStreamRevocations(state),
              ids,
              clock,
              logger,
              settings.REALTIME_HEARTBEAT,
            ),
          inject: [
            RealtimeStream,
            PresenceTracker,
            AuthStateReader,
            IdGenerator,
            Clock,
            LoggerPort,
            RealtimeConfig.token,
          ],
        },
        {
          provide: RealtimeTransports,
          useFactory: (
            config: AppConfig,
            settings: RealtimeSettings,
            http: HttpSettings,
            verifier: AccessTokenVerifier,
            connections: RealtimeConnections,
          ) => {
            if (!options.serveConnections(config)) {
              return new RealtimeTransports([]);
            }
            const components = new RealtimeComponents(settings);
            return new RealtimeTransports(
              components.transports(
                connections,
                components.authenticator(verifier),
                {
                  ssePath: options.ssePath,
                  socketNamespace: options.socketNamespace,
                  allowedOrigins: http.WEB_ORIGINS,
                },
              ),
            );
          },
          inject: [
            AppConfig,
            RealtimeConfig.token,
            HttpConfig.token,
            AccessTokenVerifier,
            RealtimeConnections,
          ],
        },
        RealtimeLifecycle,
      ],
      exports: [RealtimePublisher, RealtimeStream, PresenceTracker],
    };
  }

  /** The adapter the service asks for, already provided by its module (`ValkeyModule`), or the single-process in-memory one. */
  private static storeProvider<T>(
    token: abstract new (...args: never[]) => T,
    adapter: (new (...args: never[]) => T) | undefined,
    fallback: Omit<Extract<Provider, { useFactory: unknown }>, 'provide'>,
  ): Provider {
    return adapter === undefined
      ? { provide: token, ...fallback }
      : { provide: token, useExisting: adapter };
  }
}
