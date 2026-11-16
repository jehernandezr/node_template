import {
  ChangeMessageVisibilityCommand,
  GetQueueUrlCommand,
  SendMessageCommand,
} from '@aws-sdk/client-sqs';
import {
  MessageDispatcher,
  MessagingErrorCode,
  PermanentMessageError,
} from '@platform/messaging';
import { InMemoryProcessedMessageStore } from '@platform/messaging/test-utils';
import { AwsErrorTranslator } from '../aws-error-translator.js';
import { AwsMessagingNames } from '../aws-messaging-names.js';
import { DeadLetterAttribute } from '../dead-letter-attribute.enum.js';
import { SqsDeadLetterRedriver } from '../sqs-dead-letter-redriver.js';
import { SqsDeliveryProcessor } from '../sqs-delivery-processor.js';
import { SqsLambdaHandler } from '../sqs-lambda-handler.js';
import type { SqsLambdaRecord } from '../sqs-lambda-event.js';
import { AWS_TEST_SETTINGS } from './utils/aws-test-settings.js';
import { EnvelopeBody } from './utils/envelope-body.js';
import { FakeSqsClient } from './utils/fake-sqs-client.js';
import { RecordingLogger } from './utils/recording-logger.js';
import {
  GenerateReport,
  LedgerPosted,
  TaskClosed,
} from './utils/test-contracts.js';
import { TestTopology } from './utils/test-topology.js';

const transient = () =>
  Object.assign(new Error('database down'), { retryable: true });

const bodies = new EnvelopeBody();

function setup(queueName: string) {
  const sqs = new FakeSqsClient().on(GetQueueUrlCommand, (input) => ({
    QueueUrl: `https://sqs.local/${input.QueueName}`,
  }));
  const errors = new AwsErrorTranslator();
  const names = new AwsMessagingNames(AWS_TEST_SETTINGS, sqs, errors);
  const logger = new RecordingLogger();
  const queue = TestTopology.queue(queueName);
  const dispatcher = new MessageDispatcher({
    consumer: queueName,
    processed: new InMemoryProcessedMessageStore(),
    topology: TestTopology.topology,
  });
  const processor = new SqsDeliveryProcessor(
    sqs,
    names,
    dispatcher,
    queue,
    new SqsDeadLetterRedriver(sqs, names, queue, logger, errors),
    logger,
    errors,
  );
  return {
    sqs,
    dispatcher,
    handler: new SqsLambdaHandler(processor),
  };
}

function record(
  messageId: string,
  body: string,
  receiveCount = 1,
  groupId?: string,
): SqsLambdaRecord {
  return {
    messageId,
    receiptHandle: `rh-${messageId}`,
    body,
    attributes: {
      ApproximateReceiveCount: String(receiveCount),
      ...(groupId === undefined ? {} : { MessageGroupId: groupId }),
    },
  };
}

describe('SqsLambdaHandler', () => {
  it('acks, retries and dead-letters in one batch', async () => {
    const { handler, dispatcher, sqs } = setup('reports-work');
    dispatcher.register(GenerateReport, (data) => {
      if (data.reportId === 'flaky') throw transient();
      if (data.reportId === 'broken') {
        throw new PermanentMessageError('report template missing');
      }
    });

    const response = await handler.handle({
      Records: [
        record('ok', bodies.json(GenerateReport.type, { reportId: 'r-1' })),
        record(
          'retry',
          bodies.json(GenerateReport.type, { reportId: 'flaky' }),
        ),
        record(
          'dead',
          bodies.json(GenerateReport.type, { reportId: 'broken' }),
        ),
        record('garbage', 'not json'),
      ],
    });

    expect(response).toEqual({
      batchItemFailures: [{ itemIdentifier: 'retry' }],
    });
    expect(sqs.sentOf(ChangeMessageVisibilityCommand)).toEqual([
      expect.objectContaining({
        input: {
          QueueUrl: 'https://sqs.local/test-reports-work',
          ReceiptHandle: 'rh-retry',
          VisibilityTimeout: expect.any(Number),
        },
      }),
    ]);
    const dead = sqs.sentOf(SendMessageCommand).map((command) => command.input);
    expect(dead).toHaveLength(2);
    expect(dead[0]).toMatchObject({
      QueueUrl: 'https://sqs.local/test-reports-work-dlq',
      MessageAttributes: {
        [DeadLetterAttribute.ErrorCode]: {
          DataType: 'String',
          StringValue: MessagingErrorCode.PermanentError,
        },
        [DeadLetterAttribute.SourceQueue]: {
          DataType: 'String',
          StringValue: 'reports-work',
        },
      },
    });
    expect(dead[1]).toMatchObject({
      MessageBody: 'not json',
      MessageAttributes: {
        [DeadLetterAttribute.ErrorCode]: {
          StringValue: MessagingErrorCode.InvalidEnvelope,
        },
      },
    });
  });

  it('reports a delivery as failed when its copy to the DLQ fails', async () => {
    const { handler, dispatcher, sqs } = setup('reports-work');
    dispatcher.register(GenerateReport, () => {
      throw new PermanentMessageError('bad');
    });
    sqs.on(SendMessageCommand, () => {
      throw Object.assign(new Error('throttled'), { name: 'Throttling' });
    });

    const response = await handler.handle({
      Records: [
        record('dead', bodies.json(GenerateReport.type, { reportId: 'x' })),
      ],
    });

    expect(response.batchItemFailures).toEqual([{ itemIdentifier: 'dead' }]);
  });

  it('acknowledges an event without a handler', async () => {
    const { handler, dispatcher } = setup('reports-work');
    dispatcher.register(GenerateReport, () => undefined);

    const response = await handler.handle({
      Records: [record('evt', bodies.json(TaskClosed.type, { taskId: 't' }))],
    });

    expect(response.batchItemFailures).toEqual([]);
  });

  it('returns the rest of a FIFO batch after the first failure', async () => {
    const { handler, dispatcher } = setup('ledger-projection');
    const handled: string[] = [];
    dispatcher.register(LedgerPosted, (data) => {
      handled.push(data.accountId);
      if (data.accountId === 'a-2') throw transient();
    });

    const response = await handler.handle({
      Records: [
        record(
          'm1',
          bodies.json(LedgerPosted.type, { accountId: 'a-1', amount: 1 }),
          1,
          'a-1',
        ),
        record(
          'm2',
          bodies.json(LedgerPosted.type, { accountId: 'a-2', amount: 1 }),
          1,
          'a-2',
        ),
        record(
          'm3',
          bodies.json(LedgerPosted.type, { accountId: 'a-3', amount: 1 }),
          1,
          'a-3',
        ),
      ],
    });

    expect(handled).toEqual(['a-1', 'a-2']);
    expect(response.batchItemFailures).toEqual([
      { itemIdentifier: 'm2' },
      { itemIdentifier: 'm3' },
    ]);
  });

  it('dead-letters a FIFO message with its group and deduplication id', async () => {
    const { handler, dispatcher, sqs } = setup('ledger-projection');
    dispatcher.register(LedgerPosted, () => {
      throw new PermanentMessageError('cannot project');
    });

    await handler.handle({
      Records: [
        record(
          'm1',
          bodies.json(LedgerPosted.type, { accountId: 'a-1', amount: 1 }),
          1,
          'a-1',
        ),
      ],
    });

    expect(sqs.sentOf(SendMessageCommand)[0]?.input).toMatchObject({
      QueueUrl: 'https://sqs.local/test-ledger-projection-dlq.fifo',
      MessageGroupId: 'a-1',
      MessageDeduplicationId: 'm1',
    });
  });

  it('dead-letters at the last attempt, so nothing is returned for retry', async () => {
    const { handler, dispatcher, sqs } = setup('reports-work');
    dispatcher.register(GenerateReport, () => {
      throw transient();
    });

    const response = await handler.handle({
      Records: [
        record('last', bodies.json(GenerateReport.type, { reportId: 'r' }), 3),
      ],
    });

    expect(response.batchItemFailures).toEqual([]);
    expect(sqs.sentOf(SendMessageCommand)).toHaveLength(1);
  });
});
