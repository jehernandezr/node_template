import { TestDispatcherParts } from '@platform/messaging/test-utils';
import { SystemRandomSource, SystemClock } from '@platform/kernel';
import {
  DeleteMessageBatchCommand,
  GetQueueUrlCommand,
  ReceiveMessageCommand,
} from '@aws-sdk/client-sqs';
import { FixedClock } from '@platform/kernel/test-utils';
import { MessageDispatcher, MessagingErrorCode } from '@platform/messaging';
import {
  Eventually,
  InMemoryProcessedMessageStore,
} from '@platform/messaging/test-utils';
import { AwsErrorTranslator } from '../aws-error-translator.js';
import { AwsMessagingNames } from '../aws-messaging-names.js';
import { SqsConsumerConfig } from '../sqs-consumer-config.js';
import { SqsDeadLetterRedriver } from '../sqs-dead-letter-redriver.js';
import { SqsDeliveryProcessor } from '../sqs-delivery-processor.js';
import { SqsPoller } from '../sqs-poller.js';
import type { LoggerPort } from '@platform/observability';
import { AWS_TEST_SETTINGS } from './utils/aws-test-settings.js';
import { EnvelopeBody } from './utils/envelope-body.js';
import { FakeSqsClient } from './utils/fake-sqs-client.js';
import { RecordingLogger } from './utils/recording-logger.js';
import { ThrowingLogger } from './utils/throwing-logger.js';
import { GenerateReport } from './utils/test-contracts.js';
import { TestTopology } from './utils/test-topology.js';

const bodies = new EnvelopeBody();

function setup(
  config: SqsConsumerConfig,
  logger: LoggerPort = new RecordingLogger(),
) {
  const sqs = new FakeSqsClient().on(GetQueueUrlCommand, (input) => ({
    QueueUrl: `https://sqs.local/${input.QueueName}`,
  }));
  const errors = new AwsErrorTranslator();
  const names = new AwsMessagingNames(AWS_TEST_SETTINGS, sqs, errors);
  const queue = TestTopology.queue('reports-work');
  const dispatcher = new MessageDispatcher(
    {
      clock: new SystemClock(),
      consumer: 'reports-work',
      processed: new InMemoryProcessedMessageStore(),
      topology: TestTopology.topology,
    },
    TestDispatcherParts.with(new SystemRandomSource()),
  );
  const processor = new SqsDeliveryProcessor(
    sqs,
    names,
    dispatcher,
    queue,
    new SqsDeadLetterRedriver(sqs, names, queue, logger, errors),
    logger,
    errors,
  );
  const poller = new SqsPoller(
    sqs,
    names,
    processor,
    queue,
    config,
    logger,
    errors,
    new FixedClock(),
  );
  return { sqs, dispatcher, poller };
}

function serverFault(): never {
  throw Object.assign(new Error('boom'), {
    name: 'ServiceUnavailable',
    $fault: 'server',
    $metadata: {},
  });
}

describe('SqsPoller.pollOnce', () => {
  it('receives, dispatches and deletes the acknowledged messages', async () => {
    const { sqs, dispatcher, poller } = setup(
      new SqsConsumerConfig({ waitTimeSeconds: 1 }),
    );
    dispatcher.register(GenerateReport, (data) => {
      if (data.reportId === 'flaky') {
        throw Object.assign(new Error('database down'), { retryable: true });
      }
    });
    sqs.once(ReceiveMessageCommand, () => ({
      Messages: [
        {
          MessageId: 'ok',
          ReceiptHandle: 'rh-ok',
          Body: bodies.json(GenerateReport.type, { reportId: 'r-1' }),
          Attributes: { ApproximateReceiveCount: '1' },
        },
        {
          MessageId: 'retry',
          ReceiptHandle: 'rh-retry',
          Body: bodies.json(GenerateReport.type, { reportId: 'flaky' }),
          Attributes: { ApproximateReceiveCount: '1' },
        },
      ],
    }));

    expect(await poller.pollOnce()).toEqual({
      received: 2,
      acknowledged: 1,
      redelivered: 1,
    });
    expect(sqs.sentOf(ReceiveMessageCommand)[0]?.input).toMatchObject({
      QueueUrl: 'https://sqs.local/test-reports-work',
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 1,
      MessageSystemAttributeNames: [
        'ApproximateReceiveCount',
        'MessageGroupId',
      ],
    });
    expect(sqs.sentOf(DeleteMessageBatchCommand)[0]?.input).toEqual({
      QueueUrl: 'https://sqs.local/test-reports-work',
      Entries: [{ Id: '0', ReceiptHandle: 'rh-ok' }],
    });
  });

  it('reports a failed receive with the translated operation', async () => {
    const { sqs, poller } = setup(new SqsConsumerConfig());
    sqs.once(ReceiveMessageCommand, serverFault);

    await expect(poller.pollOnce()).rejects.toMatchObject({
      code: MessagingErrorCode.TransportFailed,
      message: expect.stringContaining('sqs:ReceiveMessage'),
    });
  });

  it('logs and keeps going when a delete of the batch fails', async () => {
    const logger = new RecordingLogger();
    const { sqs, dispatcher, poller } = setup(new SqsConsumerConfig(), logger);
    dispatcher.register(GenerateReport, () => undefined);
    sqs.once(ReceiveMessageCommand, () => ({
      Messages: [
        {
          MessageId: 'ok',
          ReceiptHandle: 'rh-ok',
          Body: bodies.json(GenerateReport.type, { reportId: 'r-1' }),
        },
      ],
    }));
    sqs.once(DeleteMessageBatchCommand, serverFault);

    expect(await poller.pollOnce()).toMatchObject({ acknowledged: 1 });
    expect(logger.lines).toContainEqual(
      expect.objectContaining({
        level: 'warn',
        message: 'could not delete processed messages',
      }),
    );
  });
});

describe('SqsPoller.start and stop', () => {
  it('keeps polling after an error and stops when asked', async () => {
    const logger = new RecordingLogger();
    const { sqs, poller } = setup(
      new SqsConsumerConfig({ errorDelayMs: 0 }),
      logger,
    );
    sqs.once(ReceiveMessageCommand, serverFault);

    poller.start();
    await Eventually.until(() => sqs.pendingReceives === 1);
    await poller.stop();

    expect(sqs.sentOf(ReceiveMessageCommand)).toHaveLength(2);
    expect(logger.lines[0]).toMatchObject({
      level: 'error',
      message: 'sqs polling failed',
      fields: {
        error_code: MessagingErrorCode.TransportFailed,
      },
    });
  });

  it('keeps polling when the logger throws too', async () => {
    const { sqs, poller } = setup(
      new SqsConsumerConfig({ errorDelayMs: 0 }),
      new ThrowingLogger(),
    );
    sqs.once(ReceiveMessageCommand, serverFault);

    poller.start();
    await Eventually.until(() => sqs.pendingReceives === 1);
    await poller.stop();

    expect(sqs.sentOf(ReceiveMessageCommand)).toHaveLength(2);
  });

  it('stops the long polling that is waiting and is idempotent', async () => {
    const { sqs, poller } = setup(new SqsConsumerConfig());

    poller.start();
    poller.start();
    await Eventually.until(() => sqs.pendingReceives === 1);
    await poller.stop();
    await poller.stop();

    expect(sqs.pendingReceives).toBe(0);
    expect(sqs.sentOf(ReceiveMessageCommand)).toHaveLength(1);
  });
});
