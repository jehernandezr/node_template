import { spawnSync } from 'node:child_process';
import {
  CreateTopicCommand,
  SNSClient,
  SubscribeCommand,
} from '@aws-sdk/client-sns';
import {
  CreateQueueCommand,
  GetQueueAttributesCommand,
  ReceiveMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import {
  InMemoryOutboxStore,
  InMemoryProcessedMessageStore,
  MessageDispatcher,
  MessagingErrorCode,
  OutboxRelay,
  PermanentMessageError,
  type TopologyDocument,
  topologyFromContracts,
} from '@platform/messaging';
import {
  GenericContainer,
  type StartedTestContainer,
  Wait,
} from 'testcontainers';
import {
  GenerateReport,
  ledgerContract,
  LedgerPosted,
  RecordingLogger,
  reportsContract,
  TaskClosed,
  TaskReopened,
  tasksContract,
} from '../test/fixtures.js';
import { AwsMessagingNames } from './messaging-names.js';
import { SnsSqsEnvelopePublisher } from './sns-sqs-envelope-publisher.js';
import { SnsSqsMessageBus } from './sns-sqs-message-bus.js';
import {
  DeadLetterAttribute,
  SqsDeliveryRunner,
} from './sqs-delivery-runner.js';

/**
 * Pruebas contra LocalStack (SNS y SQS reales) con Testcontainers. Corren solo
 * si Docker responde; `AWS_INTEGRATION=off` las salta. `LOCALSTACK_IMAGE`
 * cambia la imagen (por defecto la de docker-compose).
 */
const IMAGE = process.env['LOCALSTACK_IMAGE'] ?? 'localstack/localstack:4';
const REGION = 'us-east-1';
const ACCOUNT = '000000000000';
const PREFIX = 'it';
const TRACEPARENT = '00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01';

function dockerAvailable(): boolean {
  if (process.env['AWS_INTEGRATION'] === 'off') return false;
  const probe = spawnSync('docker', ['info'], {
    stdio: 'ignore',
    timeout: 10_000,
  });
  return probe.status === 0;
}

const describeWithDocker = dockerAvailable() ? describe : describe.skip;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

/**
 * Crea en LocalStack lo mismo que el módulo `messaging` de Terraform a partir
 * del documento de la topología: tópicos, colas con su DLQ y redrive, y
 * suscripciones con entrega cruda y filtro por `type` en el cuerpo.
 */
async function provision(
  document: TopologyDocument,
  sns: SNSClient,
  sqs: SQSClient,
  names: AwsMessagingNames,
): Promise<void> {
  const topicArns = new Map<string, string>();
  for (const topic of document.topics) {
    const output = await sns.send(
      new CreateTopicCommand({
        Name: names.topicName(topic.name, topic.fifo),
        Attributes: topic.fifo
          ? { FifoTopic: 'true', ContentBasedDeduplication: 'true' }
          : {},
      }),
    );
    topicArns.set(topic.name, output.TopicArn as string);
  }
  for (const queue of document.queues) {
    const fifo = queue.fifo
      ? { FifoQueue: 'true', ContentBasedDeduplication: 'true' }
      : {};
    const dlq = await sqs.send(
      new CreateQueueCommand({
        QueueName: names.deadLetterQueueName(queue.name, queue.fifo),
        Attributes: fifo,
      }),
    );
    const dlqArn = (
      await sqs.send(
        new GetQueueAttributesCommand({
          QueueUrl: dlq.QueueUrl,
          AttributeNames: ['QueueArn'],
        }),
      )
    ).Attributes?.['QueueArn'] as string;
    const created = await sqs.send(
      new CreateQueueCommand({
        QueueName: names.queueName(queue.name, queue.fifo),
        Attributes: {
          ...fifo,
          VisibilityTimeout: String(queue.visibilityTimeoutSeconds),
          RedrivePolicy: JSON.stringify({
            deadLetterTargetArn: dlqArn,
            maxReceiveCount: queue.dlq.maxReceiveCount,
          }),
        },
      }),
    );
    const queueArn = (
      await sqs.send(
        new GetQueueAttributesCommand({
          QueueUrl: created.QueueUrl,
          AttributeNames: ['QueueArn'],
        }),
      )
    ).Attributes?.['QueueArn'] as string;
    for (const subscription of queue.subscriptions) {
      await sns.send(
        new SubscribeCommand({
          TopicArn: topicArns.get(subscription.topic),
          Protocol: 'sqs',
          Endpoint: queueArn,
          Attributes: {
            RawMessageDelivery: 'true',
            ...(subscription.filterTypes.length > 0
              ? {
                  FilterPolicyScope: 'MessageBody',
                  FilterPolicy: JSON.stringify({
                    type: subscription.filterTypes,
                  }),
                }
              : {}),
          },
        }),
      );
    }
  }
}

describeWithDocker('SNS/SQS adapter against LocalStack', () => {
  jest.setTimeout(180_000);

  let container: StartedTestContainer;
  let sns: SNSClient;
  let sqs: SQSClient;
  let names: AwsMessagingNames;
  const topology = topologyFromContracts([
    tasksContract,
    reportsContract,
    ledgerContract,
  ]);

  beforeAll(async () => {
    container = await new GenericContainer(IMAGE)
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
      // Credenciales ficticias que LocalStack acepta; no son secretos.
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
    );
    await provision(topology.toJSON(), sns, sqs, names);
  });

  afterAll(async () => {
    sns?.destroy();
    sqs?.destroy();
    await container?.stop();
  });

  function wire(queue: string) {
    const publisher = new SnsSqsEnvelopePublisher({ sns, sqs, names });
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
    const runner = new SqsDeliveryRunner({
      sqs,
      names,
      dispatcher,
      topology,
      queue,
      logger: new RecordingLogger(),
      waitTimeSeconds: 1,
    });
    return { publisher, bus, dispatcher, runner };
  }

  /** Hace polling hasta que `done` sea verdadero o se agote el tiempo. */
  async function pollUntil(
    runner: SqsDeliveryRunner,
    done: () => boolean,
    timeoutMs = 20_000,
  ): Promise<void> {
    const until = Date.now() + timeoutMs;
    while (!done() && Date.now() < until) {
      await runner.pollOnce();
    }
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
    const { bus, dispatcher, runner } = wire('reports-work');
    const seen: { taskId: string; traceId?: string }[] = [];
    dispatcher.register(TaskClosed, (data, envelope) => {
      seen.push({ taskId: data.taskId, traceId: envelope.traceparent });
    });

    await bus.publish(TaskReopened, { taskId: 'filtered-out' });
    await bus.publish(TaskClosed, { taskId: 't-1' });

    await pollUntil(runner, () => seen.length > 0);
    expect(seen).toEqual([{ taskId: 't-1', traceId: TRACEPARENT }]);
    // The reopened event never reached the queue and the closed one was deleted.
    expect(await receiveRaw('reports-work', false)).toEqual([]);
  });

  it('retries with ChangeMessageVisibility and processes on a later receive', async () => {
    const { bus, dispatcher, runner } = wire('reports-work');
    let attempts = 0;
    dispatcher.register(GenerateReport, () => {
      attempts++;
      if (attempts === 1) {
        throw Object.assign(new Error('database down'), { retryable: true });
      }
    });

    await bus.send(GenerateReport, { reportId: 'r-1' });
    await pollUntil(runner, () => attempts >= 2);
    expect(attempts).toBe(2);
  });

  it('copies a permanent failure to the DLQ with its reason and removes it from the queue', async () => {
    const { bus, dispatcher, runner } = wire('reports-work');
    let handled = 0;
    dispatcher.register(GenerateReport, () => {
      handled++;
      throw new PermanentMessageError('template missing');
    });

    await bus.send(GenerateReport, { reportId: 'r-2' });
    await pollUntil(runner, () => handled > 0);
    await sleep(200);

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
    const { bus, dispatcher, runner } = wire('ledger-projection');
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
    await pollUntil(runner, () => amounts.length >= 4);
    expect(amounts).toEqual([1, 2, 3, 4]);
  });

  it('publishes outbox records through the relay', async () => {
    const { publisher, dispatcher, runner } = wire('reports-work');
    const reports: string[] = [];
    dispatcher.register(GenerateReport, (data) => {
      reports.push(data.reportId);
    });
    const store = new InMemoryOutboxStore();
    const relay = new OutboxRelay({
      store,
      publisher,
      topology,
      backoff: { baseMs: 100, maxMs: 1_000, jitter: false },
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
    await pollUntil(runner, () => reports.length > 0);
    expect(reports).toEqual(['from-outbox']);
  });
});
