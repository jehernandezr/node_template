import { Test } from '@nestjs/testing';
import { AccessTokenVerifier, AuthStateReader } from '@platform/auth';
import { ConfigModule } from '@platform/config/nest';
import { Clock, IdGenerator, SystemClock } from '@platform/kernel';
import { SequentialIdGenerator } from '@platform/kernel/test-utils';
import { SilentLogger } from '@platform/messaging/test-utils';
import { LoggerPort } from '@platform/observability';
import { Global, Module } from '@nestjs/common';
import { RealtimePublisher } from '../../realtime-publisher.js';
import { RealtimeStream } from '../../stream/realtime-stream.js';
import { RealtimeTestAuth } from '../../__tests__/utils/index.js';
import { RealtimeModule } from '../realtime.module.js';

const auth = RealtimeTestAuth.create();

@Global()
@Module({
  providers: [
    { provide: Clock, useValue: new SystemClock() },
    { provide: IdGenerator, useValue: new SequentialIdGenerator() },
    { provide: LoggerPort, useValue: new SilentLogger() },
    {
      provide: AccessTokenVerifier,
      useFactory: async () => (await auth).verifier,
    },
    {
      provide: AuthStateReader,
      useFactory: async () => (await auth).state,
    },
  ],
  exports: [
    Clock,
    IdGenerator,
    LoggerPort,
    AccessTokenVerifier,
    AuthStateReader,
  ],
})
class PlatformStubsModule {}

describe('RealtimeModule', () => {
  it('publishes into the in-process stream when no adapter is given', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ env: {} }),
        PlatformStubsModule,
        RealtimeModule.forRoot({
          ssePath: '/v1/notifications/stream',
          socketNamespace: '/notifications',
          serveConnections: () => false,
        }),
      ],
    }).compile();

    await moduleRef
      .get(RealtimePublisher)
      .publish('user-ana', { type: 'notification', data: { n: 1 } });

    await expect(
      moduleRef.get(RealtimeStream).readAfter('user-ana', undefined, 10),
    ).resolves.toMatchObject([{ type: 'notification', data: { n: 1 } }]);
    await moduleRef.close();
  });
});
