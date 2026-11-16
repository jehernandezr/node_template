import { Module } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import {
  EnvelopeBuilder,
  InMemoryOutboxStore,
  InMemoryProcessedMessageStore,
} from '../../__tests__/utils/index.js';
import { DispatchOutcome } from '../../dispatch/dispatch-outcome.enum.js';
import { MessageDispatcher } from '../../dispatch/message-dispatcher.js';
import { MessagingErrorCode } from '../../errors/messaging-error-code.enum.js';
import { Topology } from '../../topology/topology.js';
import { MessagingModule } from '../messaging.module.js';
import {
  RecordingUserConsumer,
  SecondUserConsumer,
  TestPlatformModule,
  UserRegisteredV1,
} from './utils/index.js';

const EMPTY_TOPOLOGY = new Topology({ topics: [], queues: [], routes: [] });

function messagingRoot() {
  return MessagingModule.forRoot({
    source: '/services/users',
    consumer: 'users-consumer',
    topology: EMPTY_TOPOLOGY,
    outboxStore: InMemoryOutboxStore,
    processedStore: InMemoryProcessedMessageStore,
  });
}

function userRegistered(userId: string) {
  return EnvelopeBuilder.anEnvelope({
    type: UserRegisteredV1.type,
    data: { userId },
  });
}

@Module({ providers: [RecordingUserConsumer] })
class ConsumerModule {}

@Module({ providers: [SecondUserConsumer, RecordingUserConsumer] })
class ConflictingConsumersModule {}

@Module({
  providers: [
    RecordingUserConsumer,
    { provide: 'USER_CONSUMER_ALIAS', useExisting: RecordingUserConsumer },
  ],
})
class AliasedConsumerModule {}

describe('MessagingExplorer', () => {
  let moduleRef: TestingModule | undefined;

  afterEach(async () => {
    await moduleRef?.close();
    moduleRef = undefined;
  });

  it('registers @Subscribe methods without a manual register call', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [TestPlatformModule, messagingRoot(), ConsumerModule],
    }).compile();
    await moduleRef.init();

    const result = await moduleRef
      .get(MessageDispatcher)
      .dispatch(userRegistered('u-1'), { receiveCount: 1 });

    expect(result.outcome).toBe(DispatchOutcome.Processed);
    expect(moduleRef.get(RecordingUserConsumer).received).toEqual(['u-1']);
  });

  it('keeps the consumer instance as this when the handler runs', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [TestPlatformModule, messagingRoot(), ConsumerModule],
    }).compile();
    await moduleRef.init();

    await moduleRef
      .get(MessageDispatcher)
      .dispatch(userRegistered('u-3'), { receiveCount: 1 });

    expect(moduleRef.get(RecordingUserConsumer).received).toEqual(['u-3']);
  });

  it('fails the bootstrap when two handlers subscribe to the same contract', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        TestPlatformModule,
        messagingRoot(),
        ConflictingConsumersModule,
      ],
    }).compile();

    await expect(moduleRef.init()).rejects.toMatchObject({
      code: MessagingErrorCode.DuplicateHandler,
    });
  });

  it('registers a provider exposed under two tokens only once', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [TestPlatformModule, messagingRoot(), AliasedConsumerModule],
    }).compile();

    await moduleRef.init();
    const result = await moduleRef
      .get(MessageDispatcher)
      .dispatch(userRegistered('u-2'), { receiveCount: 1 });
    expect(result.outcome).toBe(DispatchOutcome.Processed);
  });
});
