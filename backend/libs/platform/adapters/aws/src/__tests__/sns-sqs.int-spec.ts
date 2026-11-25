import { SNSClient } from '@aws-sdk/client-sns';
import { ReceiveMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { SystemClock } from '@platform/kernel';
import { ContainerRuntime } from '@platform/kernel/test-utils';
import {
  MessageDispatcher,
  MessagingErrorCode,
  OutboxRelay,
  PermanentMessageError,
} from '@platform/messaging';
import {
  InMemoryOutboxStore,
  InMemoryProcessedMessageStore,
} from '@platform/messaging/test-utils';
import { BackoffStrategy, RetryPolicy } from '@platform/primitives';
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from 'testcontainers';
import { AwsErrorTranslator } from '../aws-error-translator.js';
import { AwsMessagingNames } from '../aws-messaging-names.js';
import { DeadLetterAttribute } from '../dead-letter-attribute.enum.js';
import { SnsSqsEnvelopePublisher } from '../sns-sqs-envelope-publisher.js';
import { SnsSqsMessageBus } from '../sns-sqs-message-bus.js';
import { SqsConsumerConfig } from '../sqs-consumer-config.js';
import { SqsDeadLetterRedriver } from '../sqs-dead-letter-redriver.js';
import { SqsDeliveryProcessor } from '../sqs-delivery-processor.js';
import { SqsPoller } from '../sqs-poller.js';
import { LocalStackProvisioner } from './utils/localstack-provisioner.js';
import { PollUntil } from './utils/poll-until.js';
import { RecordingLogger } from './utils/recording-logger.js';
import {
  GenerateReport,
  LedgerPosted,
  TaskClosed,
  TaskReopened,
} from './utils/test-contracts.js';
import { TestTopology } from './utils/test-topology.js';

/**
 * Tests against LocalStack (real SNS and SQS) with Testcontainers. Without Docker
 * they are skipped; with `INTEGRATION_TESTS=require` missing Docker is an error.
 * `LOCALSTACK_IMAGE` changes the image (defaults to the docker-compose one).
 */
jest.setTimeout(180_000);

const IMAGE = process.env['LOCALSTACK_IMAGE'] ?? 'localstack/localstack:4';
const REGION = 'us-east-1';
const ACCOUNT = '000000000000';
const PREFIX = 'it';
const TRACEPARENT = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';

const runtime = new ContainerRuntime(process.env);

runtime.describeIfAvailable('SNS and SQS over LocalStack', () => {
  let container: StartedTestContainer;
  let sns: SNSClient;
  let sqs: SQSClient;
  let names: AwsMessagingNames;
  const topology = TestTopology.topology;

  beforeAll(async () => {
    container = await new GenericContainer(IMAGE)
      .withAutoCleanup(runtime.autoCleanup())
      .withEnvironment({ SERVICES: 'sns,sqs' })
      .withExposedPorts(4566)
      .withWaitStrategy(
        Wait.forHttp('/_localstack/health', 4566).forStatusCode(200),
      )
      .withStartupTimeout(120_000)
      .start();
    const options = {
      region: REGION,
      endpoint: `http://${container.getHost()}:${container.getMappedPort(4566)}`,
      // Dummy credentials LocalStack accepts; they are not secrets.
      credentials: { accessKeyId: 'test', secretAccessKey: 'test' },
    };
    sns = new SNSClient(options);
    sqs = new SQSClient(options);
    names = new AwsMessagingNames(
      {
        AWS_REGION: REGION,
        AWS_ACCOUNT_ID: ACCOUNT,
        MESSAGING_NAME_PREFIX: PREFIX,
      },
      sqs,
      new AwsErrorTranslator(),
    );
    await new LocalStackProvisioner(sns, sqs, names).provision(
      topology.toJSON(),
    );
  });

  afterAll(async () => {
    sns?.destroy();
    sqs?.destroy();
    await container?.stop();
  });

  function wire(queue: string) {
    const errors = new AwsErrorTranslator();
    const logger = new RecordingLogger();
    const queueDef = TestTopology.queue(queue);
    const publisher = new SnsSqsEnvelopePublisher(sns, sqs, names, errors);
    const bus = new SnsSqsMessageBus({
      topology,
      publisher,
      source: '/services/it',
      traceparent: () => TRACEPARENT,
    });
    const dispatcher = new MessageDispatcher({
      consumer: queue,
      processed: new InMemoryProcessedMessageStore(),
      topology,
    });
    const processor = new SqsDeliveryProcessor(
      sqs,
      names,
      dispatcher,
      queueDef,
      new SqsDeadLetterRedriver(sqs, names, queueDef, logger, errors),
      logger,
      errors,
    );
    const poller = new SqsPoller(
      sqs,
      names,
      processor,
      queueDef,
      new SqsConsumerConfig({ waitTimeSeconds: 1 }),
      logger,
      errors,
      new SystemClock(),
    );
    return { publisher, bus, dispatcher, poller };
  }

  async function receiveRaw(queueName: string, fifo: boolean) {
    const output = await sqs.send(
      new ReceiveMessageCommand({
        QueueUrl: await names.queueUrl(names.queueName(queueName, fifo)),
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 1,
      }),
    );
    return output.Messages ?? [];
  }

  it('publishes to SNS and delivers through the body filter of the subscription', async () => {
    const { bus, dispatcher, poller } = wire('reports-work');
    const seen: { taskId: string; traceId?: string }[] = [];
    dispatcher.register(TaskClosed, (data, envelope) => {
      seen.push({ taskId: data.taskId, traceId: envelope.traceparent });
    });

    await bus.publish(TaskReopened, { taskId: 'filtered-out' });
    await bus.publish(TaskClosed, { taskId: 't-1' });

    await PollUntil.run(poller, () => seen.length > 0);
    expect(seen).toEqual([{ taskId: 't-1', traceId: TRACEPARENT }]);
    // The reopened event never reached the queue and the closed one was deleted when processed.
    expect(await receiveRaw('reports-work', false)).toEqual([]);
  });

  it('retries with ChangeMessageVisibility and processes on a later receive', async () => {
    const { bus, dispatcher, poller } = wire('reports-work');
    let attempts = 0;
    dispatcher.register(GenerateReport, () => {
      attempts++;
      if (attempts === 1) {
        throw Object.assign(new Error('database down'), { retryable: true });
      }
    });

    await bus.send(GenerateReport, { reportId: 'r-1' });
    await PollUntil.run(poller, () => attempts >= 2);
    expect(attempts).toBe(2);
  });

  it('copies a permanent failure to the DLQ with its reason and removes it from the queue', async () => {
    const { bus, dispatcher, poller } = wire('reports-work');
    let handled = 0;
    dispatcher.register(GenerateReport, () => {
      handled++;
      throw new PermanentMessageError('template missing');
    });

    await bus.send(GenerateReport, { reportId: 'r-2' });
    await PollUntil.run(poller, () => handled > 0);

    // The long wait of long polling gives the copy time to reach the DLQ.
    const dead = await sqs.send(
      new ReceiveMessageCommand({
        QueueUrl: await names.queueUrl(
          names.deadLetterQueueName('reports-work', false),
        ),
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 2,
        MessageAttributeNames: ['All'],
      }),
    );
    expect(dead.Messages).toHaveLength(1);
    expect(
      dead.Messages?.[0]?.MessageAttributes?.[DeadLetterAttribute.ErrorCode]
        ?.StringValue,
    ).toBe(MessagingErrorCode.PermanentError);
    expect(JSON.parse(dead.Messages?.[0]?.Body ?? '{}')).toMatchObject({
      type: GenerateReport.type,
      data: { reportId: 'r-2' },
    });
    expect(await receiveRaw('reports-work', false)).toEqual([]);
  });

  it('keeps the order of a FIFO group from topic to queue', async () => {
    const { bus, dispatcher, poller } = wire('ledger-projection');
    const amounts: number[] = [];
    dispatcher.register(LedgerPosted, (data) => {
      amounts.push(data.amount);
    });

    for (const amount of [1, 2, 3, 4]) {
      await bus.publish(
        LedgerPosted,
        { accountId: 'acc-1', amount },
        { groupId: 'acc-1' },
      );
    }
    await PollUntil.run(poller, () => amounts.length >= 4);
    expect(amounts).toEqual([1, 2, 3, 4]);
  });

  it('publishes outbox records through the relay', async () => {
    const { publisher, dispatcher, poller } = wire('reports-work');
    const reports: string[] = [];
    dispatcher.register(GenerateReport, (data) => {
      reports.push(data.reportId);
    });
    const store = new InMemoryOutboxStore();
    const relay = new OutboxRelay({
      store,
      publisher,
      topology,
      retryPolicy: new RetryPolicy(5, 100, 1_000, BackoffStrategy.None),
    });
    const outbox = new SnsSqsMessageBus({
      topology,
      publisher: {
        publish: (envelope, _target, options) => {
          store.add(envelope, { groupId: options.groupId });
          return Promise.resolve();
        },
      },
      source: '/services/it',
    });
    await outbox.send(GenerateReport, { reportId: 'from-outbox' });

    expect(await relay.relayOnce()).toMatchObject({ published: 1 });
    await PollUntil.run(poller, () => reports.length > 0);
    expect(reports).toEqual(['from-outbox']);
  });
});
