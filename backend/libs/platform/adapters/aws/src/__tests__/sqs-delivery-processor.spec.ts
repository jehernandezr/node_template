import { TestDispatcherParts } from '@platform/messaging/test-utils';
import { SystemRandomSource, SystemClock } from '@platform/kernel';
import {
  ChangeMessageVisibilityCommand,
  GetQueueUrlCommand,
  SendMessageCommand,
} from '@aws-sdk/client-sqs';
import {
  DispatchOutcome,
  type DispatchResult,
  MessageDispatcher,
  PermanentMessageError,
  topologyFromContracts,
} from '@platform/messaging';
import { InMemoryProcessedMessageStore } from '@platform/messaging/test-utils';
import { AwsErrorTranslator } from '../aws-error-translator.js';
import { AwsMessagingNames } from '../aws-messaging-names.js';
import { DeliveryAction } from '../delivery-action.enum.js';
import { SqsDeadLetterRedriver } from '../sqs-dead-letter-redriver.js';
import { SqsDeliveryProcessor } from '../sqs-delivery-processor.js';
import type { SqsDelivery } from '../sqs-delivery.js';
import { AWS_TEST_SETTINGS } from './utils/aws-test-settings.js';
import { EnvelopeBody } from './utils/envelope-body.js';
import { FakeSqsClient } from './utils/fake-sqs-client.js';
import { RecordingLogger } from './utils/recording-logger.js';
import {
  GenerateReport,
  ledgerContract,
  LedgerPosted,
  reportsContract,
  TaskClosed,
  tasksContract,
} from './utils/test-contracts.js';
import { TestTopology } from './utils/test-topology.js';

const transient = () =>
  Object.assign(new Error('database down'), { retryable: true });

const bodies = new EnvelopeBody();

function setup(queueName = 'reports-work') {
  const sqs = new FakeSqsClient().on(GetQueueUrlCommand, (input) => ({
    QueueUrl: `https://sqs.local/${input.QueueName}`,
  }));
  const errors = new AwsErrorTranslator();
  const names = new AwsMessagingNames(AWS_TEST_SETTINGS, sqs, errors);
  const topology = TestTopology.topology;
  const dispatcher = new MessageDispatcher(
    {
      clock: new SystemClock(),
      consumer: queueName,
      processed: new InMemoryProcessedMessageStore(),
      topology,
    },
    TestDispatcherParts.with(new SystemRandomSource()),
  );
  const logger = new RecordingLogger();
  const redriver = new SqsDeadLetterRedriver(
    sqs,
    names,
    TestTopology.queue(queueName),
    logger,
    errors,
  );
  const processor = new SqsDeliveryProcessor(
    sqs,
    names,
    dispatcher,
    TestTopology.queue(queueName),
    redriver,
    logger,
    errors,
  );
  return { sqs, dispatcher, processor, logger };
}

function delivery(
  messageId: string,
  body: string,
  receiveCount = 1,
  groupId?: string,
): SqsDelivery {
  return {
    messageId,
    receiptHandle: `rh-${messageId}`,
    body,
    receiveCount,
    ...(groupId === undefined ? {} : { groupId }),
  };
}

describe('SqsDeliveryProcessor', () => {
  it('acknowledges a processed delivery and reports the result', async () => {
    const { processor, dispatcher } = setup();
    dispatcher.register(GenerateReport, () => undefined);
    const message = bodies.envelope(GenerateReport.type, { reportId: 'r-1' });

    const reports = await processor.process([
      delivery('a', JSON.stringify(message)),
    ]);

    expect(reports).toEqual([
      {
        messageId: 'a',
        action: DeliveryAction.Acknowledge,
        result: { outcome: DispatchOutcome.Processed, id: message.id },
      },
    ]);
  });

  it('changes the visibility of a retried delivery and asks for redelivery', async () => {
    const { processor, dispatcher, sqs } = setup();
    dispatcher.register(GenerateReport, () => {
      throw transient();
    });

    const reports = await processor.process([
      delivery('retry', bodies.json(GenerateReport.type, { reportId: 'f' })),
    ]);

    expect(reports[0]?.action).toBe(DeliveryAction.Redeliver);
    expect(reports[0]?.result?.outcome).toBe(DispatchOutcome.RetryLater);
    expect(sqs.sentOf(ChangeMessageVisibilityCommand)).toEqual([
      expect.objectContaining({
        input: {
          QueueUrl: 'https://sqs.local/test-reports-work',
          ReceiptHandle: 'rh-retry',
          VisibilityTimeout: expect.any(Number),
        },
      }),
    ]);
  });

  it('dead-letters a permanent failure and acknowledges it once copied', async () => {
    const { processor, dispatcher, sqs } = setup();
    dispatcher.register(GenerateReport, () => {
      throw new PermanentMessageError('report template missing');
    });

    const reports = await processor.process([
      delivery('dead', bodies.json(GenerateReport.type, { reportId: 'x' })),
    ]);

    expect(reports[0]).toMatchObject({
      action: DeliveryAction.Acknowledge,
      result: { outcome: DispatchOutcome.DeadLetter },
    });
    expect(sqs.sentOf(SendMessageCommand)).toHaveLength(1);
  });

  it('redelivers a dead-letter whose copy fails', async () => {
    const { processor, dispatcher, sqs } = setup();
    dispatcher.register(GenerateReport, () => {
      throw new PermanentMessageError('bad');
    });
    sqs.once(SendMessageCommand, () => {
      throw Object.assign(new Error('throttled'), { name: 'Throttling' });
    });

    const reports = await processor.process([
      delivery('dead', bodies.json(GenerateReport.type, { reportId: 'x' })),
    ]);

    expect(reports[0]?.action).toBe(DeliveryAction.Redeliver);
  });

  it('acknowledges an event without a handler', async () => {
    const { processor, dispatcher, sqs } = setup();
    dispatcher.register(GenerateReport, () => undefined);

    const reports = await processor.process([
      delivery('evt', bodies.json(TaskClosed.type, { taskId: 't' })),
    ]);

    expect(reports[0]).toMatchObject({
      action: DeliveryAction.Acknowledge,
      result: { outcome: DispatchOutcome.Ignored },
    });
    expect(sqs.sentOf(ChangeMessageVisibilityCommand)).toHaveLength(0);
  });

  it('dead-letters at the last attempt of the contract policy', async () => {
    const { processor, dispatcher, sqs } = setup();
    dispatcher.register(GenerateReport, () => {
      throw transient();
    });

    const reports = await processor.process([
      delivery('last', bodies.json(GenerateReport.type, { reportId: 'r' }), 3),
    ]);

    expect(reports[0]).toMatchObject({
      action: DeliveryAction.Acknowledge,
      result: { outcome: DispatchOutcome.DeadLetter },
    });
    expect(sqs.sentOf(SendMessageCommand)).toHaveLength(1);
  });

  it('stops a FIFO batch at the first failure and returns the rest without dispatching', async () => {
    const { processor, dispatcher, sqs } = setup('ledger-projection');
    const handled: string[] = [];
    dispatcher.register(LedgerPosted, (data) => {
      handled.push(data.accountId);
      if (data.accountId === 'a-2') throw transient();
    });

    const reports = await processor.process([
      delivery(
        'm1',
        bodies.json(LedgerPosted.type, { accountId: 'a-1', amount: 1 }),
        1,
        'a-1',
      ),
      delivery(
        'm2',
        bodies.json(LedgerPosted.type, { accountId: 'a-2', amount: 1 }),
        1,
        'a-2',
      ),
      delivery(
        'm3',
        bodies.json(LedgerPosted.type, { accountId: 'a-3', amount: 1 }),
        1,
        'a-3',
      ),
    ]);

    expect(handled).toEqual(['a-1', 'a-2']);
    expect(reports.map((report) => report.action)).toEqual([
      DeliveryAction.Acknowledge,
      DeliveryAction.Redeliver,
      DeliveryAction.Redeliver,
    ]);
    expect(reports[2]?.result).toBeUndefined();
    expect(
      sqs
        .sentOf(ChangeMessageVisibilityCommand)
        .map((command) => command.input),
    ).toEqual([
      expect.objectContaining({ ReceiptHandle: 'rh-m2' }),
      expect.objectContaining({ ReceiptHandle: 'rh-m3', VisibilityTimeout: 0 }),
    ]);
  });

  it('redelivers a delivery whose dispatch throws and logs it', async () => {
    const topology = topologyFromContracts([
      tasksContract,
      reportsContract,
      ledgerContract,
    ]);
    class ThrowingDispatcher extends MessageDispatcher {
      override async dispatch(): Promise<DispatchResult> {
        throw new Error('dispatcher down');
      }
    }
    const sqs = new FakeSqsClient().on(GetQueueUrlCommand, (input) => ({
      QueueUrl: `https://sqs.local/${input.QueueName}`,
    }));
    const errors = new AwsErrorTranslator();
    const names = new AwsMessagingNames(AWS_TEST_SETTINGS, sqs, errors);
    const logger = new RecordingLogger();
    const queue = TestTopology.queue('reports-work');
    const processor = new SqsDeliveryProcessor(
      sqs,
      names,
      new ThrowingDispatcher(
        {
          clock: new SystemClock(),
          consumer: 'reports-work',
          processed: new InMemoryProcessedMessageStore(),
          topology,
        },
        TestDispatcherParts.with(new SystemRandomSource()),
      ),
      queue,
      new SqsDeadLetterRedriver(sqs, names, queue, logger, errors),
      logger,
      errors,
    );

    const reports = await processor.process([
      delivery('boom', bodies.json(GenerateReport.type, { reportId: 'b' })),
    ]);

    expect(reports).toEqual([
      { messageId: 'boom', action: DeliveryAction.Redeliver },
    ]);
    expect(logger.lines).toContainEqual(
      expect.objectContaining({ level: 'error', message: 'dispatcher threw' }),
    );
  });
});
