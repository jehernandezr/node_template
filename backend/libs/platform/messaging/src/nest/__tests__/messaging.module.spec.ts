import { Global, Module } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { ResilienceModule } from '@platform/resilience/nest';
import { JobRunner, SchedulingMode } from '@platform/scheduling';
import { SchedulingModule } from '@platform/scheduling/nest';
import { MessageBus } from '../../bus/message-bus.js';
import { OutboxMessageBus } from '../../bus/outbox-message-bus.js';
import {
  EnvelopeBuilder,
  InMemoryOutboxStore,
  InMemoryProcessedMessageStore,
  RecordingEnvelopePublisher,
  SilentLogger,
} from '../../__tests__/utils/index.js';
import { DispatchOutcome } from '../../dispatch/dispatch-outcome.enum.js';
import { MessageDispatcher } from '../../dispatch/message-dispatcher.js';
import { MessagingErrorCode } from '../../errors/messaging-error-code.enum.js';
import { MessagingJob } from '../../jobs/messaging-job.enum.js';
import { OutboxRelay } from '../../outbox/outbox-relay.js';
import { QueueDef } from '../../topology/queue-def.js';
import { Route } from '../../topology/route.js';
import { TopicDef } from '../../topology/topic-def.js';
import { Topology } from '../../topology/topology.js';
import { MessagingModule } from '../messaging.module.js';
import type {
  MessagingModuleExtras,
  MessagingModuleOptions,
} from '../messaging-module-options.js';
import { AcceptAnyTenantVerifier } from '../../dispatch/accept-any-tenant-verifier.js';
import {
  RecordingDeliveryContext,
  RecordingUserConsumer,
  RejectingTenantVerifier,
  TestPlatformModule,
  UserRegisteredV1,
} from './utils/index.js';

const events = new TopicDef('user-events');
const topology = new Topology({
  topics: [events],
  queues: [
    new QueueDef('notifications')
      .subscribesTo(events)
      .deadLetter({ maxReceiveCount: 5 }),
  ],
  routes: [Route.event(UserRegisteredV1).to(events)],
});

const adapters: MessagingModuleExtras = {
  outboxStore: InMemoryOutboxStore,
  processedStore: InMemoryProcessedMessageStore,
};

type RootOverrides = Partial<MessagingModuleOptions & MessagingModuleExtras>;

function rootOptions(overrides: RootOverrides = {}) {
  return {
    source: '/services/users',
    consumer: 'users-consumer',
    topology,
    ...adapters,
    ...overrides,
  };
}

function userRegistered(id: string, tenantid?: string) {
  return EnvelopeBuilder.anEnvelope({
    id,
    type: UserRegisteredV1.type,
    data: { userId: 'u-1' },
    ...(tenantid === undefined ? {} : { tenantid }),
  });
}

/** Bus que publica directo, sin outbox, para probar la opción `bus`. */
class DirectBus extends MessageBus {
  publish(): Promise<never> {
    return Promise.reject(new Error('direct bus'));
  }

  send(): Promise<never> {
    return Promise.reject(new Error('direct bus'));
  }
}

@Global()
@Module({ providers: [DirectBus], exports: [DirectBus] })
class DirectBusModule {}

@Global()
@Module({
  providers: [RejectingTenantVerifier],
  exports: [RejectingTenantVerifier],
})
class TenantVerifierModule {}

@Global()
@Module({
  providers: [AcceptAnyTenantVerifier, RecordingDeliveryContext],
  exports: [AcceptAnyTenantVerifier, RecordingDeliveryContext],
})
class DeliveryContextModule {}

@Module({ providers: [RecordingUserConsumer] })
class ConsumerModule {}

describe('MessagingModule', () => {
  let moduleRef: TestingModule | undefined;

  afterEach(async () => {
    await moduleRef?.close();
    moduleRef = undefined;
  });

  describe('when a mandatory adapter is missing', () => {
    it.each([
      ['outboxStore', { outboxStore: undefined }],
      ['processedStore', { processedStore: undefined }],
      ['publisher when relay is enabled', { relay: true }],
    ])('throws InvalidOptions without %s', (_label, overrides) => {
      expect(() => MessagingModule.forRoot(rootOptions(overrides))).toThrow(
        expect.objectContaining({
          code: MessagingErrorCode.InvalidOptions,
        }),
      );
    });
  });

  describe('when the module is imported with the outbox bus', () => {
    beforeEach(async () => {
      moduleRef = await Test.createTestingModule({
        imports: [TestPlatformModule, MessagingModule.forRoot(rootOptions())],
      }).compile();
    });

    it('provides the outbox bus as MessageBus', () => {
      expect(moduleRef?.get(MessageBus)).toBeInstanceOf(OutboxMessageBus);
    });

    it('refuses to publish outside a transaction', async () => {
      await expect(
        moduleRef?.get(MessageBus).publish(UserRegisteredV1, { userId: 'u-1' }),
      ).rejects.toMatchObject({
        code: MessagingErrorCode.TransactionRequired,
      });
    });

    it('does not provide an OutboxRelay without a publisher', () => {
      expect(() => moduleRef?.get(OutboxRelay)).toThrow();
    });
  });

  it('uses the bus given in the bus option instead of the outbox bus', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        TestPlatformModule,
        DirectBusModule,
        MessagingModule.forRoot(rootOptions({ bus: DirectBus })),
      ],
    }).compile();

    expect(moduleRef.get(MessageBus)).toBeInstanceOf(DirectBus);
  });

  it('builds the options with a factory in forRootAsync and dispatches', async () => {
    moduleRef = await Test.createTestingModule({
      imports: [
        TestPlatformModule,
        ConsumerModule,
        MessagingModule.forRootAsync({
          ...adapters,
          useFactory: () => ({
            source: '/services/users',
            consumer: 'users-consumer',
            topology,
          }),
        }),
      ],
    }).compile();
    await moduleRef.init();

    const result = await moduleRef
      .get(MessageDispatcher)
      .dispatch(userRegistered('e-async'), { receiveCount: 1 });

    expect(result.outcome).toBe(DispatchOutcome.Processed);
    expect(moduleRef.get(RecordingUserConsumer).received).toEqual(['u-1']);
  });

  describe('when the relay is enabled with a publisher', () => {
    beforeEach(async () => {
      moduleRef = await Test.createTestingModule({
        imports: [
          TestPlatformModule,
          ResilienceModule.forRoot(),
          SchedulingModule.forRoot({
            logger: SilentLogger,
            mode: SchedulingMode.External,
          }),
          MessagingModule.forRoot(
            rootOptions({
              relay: true,
              publisher: RecordingEnvelopePublisher,
            }),
          ),
        ],
      }).compile();
      await moduleRef.init();
    });

    it('publishes the pending outbox records when the relay job runs', async () => {
      moduleRef?.get(InMemoryOutboxStore).add(userRegistered('e-pending'));

      await moduleRef?.get(JobRunner).runNow(MessagingJob.OutboxRelay);

      expect(
        moduleRef
          ?.get(RecordingEnvelopePublisher)
          .published.map((p) => p.envelope.id),
      ).toEqual(['e-pending']);
    });

    it.each([
      MessagingJob.OutboxRetention,
      MessagingJob.ProcessedMessageRetention,
    ])('registers the %s job', async (name) => {
      await expect(
        moduleRef?.get(JobRunner).runNow(name),
      ).resolves.toBeUndefined();
    });
  });

  describe('when the consumer checks tenants', () => {
    it('sends a message of another tenant to the dead letter with TenantMismatch', async () => {
      moduleRef = await Test.createTestingModule({
        imports: [
          TestPlatformModule,
          ConsumerModule,
          MessagingModule.forRoot(
            rootOptions({ expectedTenantId: 'tenant-a' }),
          ),
        ],
      }).compile();
      await moduleRef.init();

      const result = await moduleRef
        .get(MessageDispatcher)
        .dispatch(userRegistered('e-t1', 'tenant-b'), { receiveCount: 1 });

      expect(result).toMatchObject({
        outcome: DispatchOutcome.DeadLetter,
        code: MessagingErrorCode.TenantMismatch,
      });
    });

    it('sends a message to the dead letter when the tenant verifier rejects it', async () => {
      moduleRef = await Test.createTestingModule({
        imports: [
          TestPlatformModule,
          TenantVerifierModule,
          ConsumerModule,
          MessagingModule.forRoot(
            rootOptions({ tenantVerifier: RejectingTenantVerifier }),
          ),
        ],
      }).compile();
      await moduleRef.init();

      const result = await moduleRef
        .get(MessageDispatcher)
        .dispatch(userRegistered('e-t2', 'tenant-a'), { receiveCount: 1 });

      expect(result).toMatchObject({
        outcome: DispatchOutcome.DeadLetter,
        code: MessagingErrorCode.TenantMismatch,
      });
    });
  });

  describe('when the service declares a delivery context', () => {
    it('claims and runs the handler inside the context opened for the envelope', async () => {
      moduleRef = await Test.createTestingModule({
        imports: [
          TestPlatformModule,
          DeliveryContextModule,
          ConsumerModule,
          MessagingModule.forRoot(
            rootOptions({
              tenantVerifier: AcceptAnyTenantVerifier,
              deliveryContext: RecordingDeliveryContext,
            }),
          ),
        ],
      }).compile();
      await moduleRef.init();

      const result = await moduleRef
        .get(MessageDispatcher)
        .dispatch(userRegistered('e-ctx', 'tenant-a'), { receiveCount: 1 });

      expect(result.outcome).toBe(DispatchOutcome.Processed);
      expect(moduleRef.get(RecordingDeliveryContext).tenants).toEqual([
        'tenant-a',
      ]);
      expect(moduleRef.get(RecordingUserConsumer).received).toEqual(['u-1']);
    });
  });
});
