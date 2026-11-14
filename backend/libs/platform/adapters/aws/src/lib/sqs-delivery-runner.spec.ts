import type { SQSClient } from '@aws-sdk/client-sqs';
import {
  createEnvelope,
  InMemoryProcessedMessageStore,
  MessageDispatcher,
  MessagingErrorCode,
  PermanentMessageError,
  topologyFromContracts,
} from '@platform/messaging';
import {
  awsTestConfig,
  fakeClient,
  GenerateReport,
  ledgerContract,
  LedgerPosted,
  RecordingLogger,
  reportsContract,
  TaskClosed,
  tasksContract,
} from '../test/fixtures.js';
import { AwsMessagingNames } from './messaging-names.js';
import {
  DeadLetterAttribute,
  DeliveryAction,
  type SqsLambdaRecord,
  SqsDeliveryRunner,
} from './sqs-delivery-runner.js';

const topology = topologyFromContracts([
  tasksContract,
  reportsContract,
  ledgerContract,
]);

function body(type: string, data: unknown, id: string): string {
  return JSON.stringify(
    createEnvelope(
      { type, source: '/test', data },
      { newId: () => id, now: () => new Date('2026-01-01T00:00:00.000Z') },
    ),
  );
}

function record(
  messageId: string,
  messageBody: string,
  receiveCount = 1,
  groupId?: string,
): SqsLambdaRecord {
  return {
    messageId,
    receiptHandle: `rh-${messageId}`,
    body: messageBody,
    attributes: {
      ApproximateReceiveCount: String(receiveCount),
      ...(groupId === undefined ? {} : { MessageGroupId: groupId }),
    },
  };
}

function setup(
  queue = 'reports-work',
  respond?: Parameters<typeof fakeClient>[0],
) {
  const sqs = fakeClient(
    respond ??
      ((name, input) =>
        name === 'GetQueueUrlCommand'
          ? { QueueUrl: `https://sqs.local/${String(input['QueueName'])}` }
          : {}),
  );
  const names = new AwsMessagingNames(
    awsTestConfig,
    sqs.client as unknown as SQSClient,
  );
  const dispatcher = new MessageDispatcher({
    consumer: queue,
    processed: new InMemoryProcessedMessageStore(),
    topology,
  });
  const logger = new RecordingLogger();
  const runner = new SqsDeliveryRunner({
    sqs: sqs.client as unknown as SQSClient,
    names,
    dispatcher,
    topology,
    queue,
    logger,
    waitTimeSeconds: 1,
    errorDelayMs: 1,
  });
  const calls = (name: string) =>
    sqs.sent.filter((c) => c.name === name).map((c) => c.input);
  return { runner, dispatcher, sqs, logger, calls };
}

const transient = () =>
  Object.assign(new Error('database down'), { retryable: true });

describe('SqsDeliveryRunner in Lambda', () => {
  it('acks, retries with ChangeMessageVisibility and dead-letters in one batch', async () => {
    const { runner, dispatcher, calls } = setup();
    dispatcher.register(GenerateReport, (data) => {
      if (data.reportId === 'flaky') throw transient();
      if (data.reportId === 'broken') {
        throw new PermanentMessageError('report template missing');
      }
    });

    const response = await runner.handleLambdaEvent({
      Records: [
        record('ok', body(GenerateReport.type, { reportId: 'r-1' }, 'e-1')),
        record(
          'retry',
          body(GenerateReport.type, { reportId: 'flaky' }, 'e-2'),
        ),
        record(
          'dead',
          body(GenerateReport.type, { reportId: 'broken' }, 'e-3'),
        ),
        record('garbage', 'not json'),
      ],
    });

    expect(response).toEqual({
      batchItemFailures: [{ itemIdentifier: 'retry' }],
    });
    // Backoff of the contract: 2 s base, first retry.
    expect(calls('ChangeMessageVisibilityCommand')).toEqual([
      {
        QueueUrl: 'https://sqs.local/test-reports-work',
        ReceiptHandle: 'rh-retry',
        VisibilityTimeout: expect.any(Number),
      },
    ]);
    const visibility = calls('ChangeMessageVisibilityCommand')[0]?.[
      'VisibilityTimeout'
    ] as number;
    expect(visibility).toBeGreaterThanOrEqual(0);
    expect(visibility).toBeLessThanOrEqual(2);

    const dead = calls('SendMessageCommand');
    expect(dead).toHaveLength(2);
    expect(dead[0]).toMatchObject({
      QueueUrl: 'https://sqs.local/test-reports-work-dlq',
      MessageBody: body(GenerateReport.type, { reportId: 'broken' }, 'e-3'),
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

  it('leaves a message for redelivery when the copy to the DLQ fails', async () => {
    const { runner, dispatcher, logger } = setup(
      'reports-work',
      (name, input) => {
        if (name === 'GetQueueUrlCommand') {
          return {
            QueueUrl: `https://sqs.local/${String(input['QueueName'])}`,
          };
        }
        if (name === 'SendMessageCommand') {
          throw Object.assign(new Error('throttled'), { name: 'Throttling' });
        }
        return {};
      },
    );
    dispatcher.register(GenerateReport, () => {
      throw new PermanentMessageError('bad');
    });

    const response = await runner.handleLambdaEvent({
      Records: [
        record('dead', body(GenerateReport.type, { reportId: 'x' }, 'e-1')),
      ],
    });
    expect(response.batchItemFailures).toEqual([{ itemIdentifier: 'dead' }]);
    expect(logger.lines).toContainEqual(
      expect.objectContaining({ level: 'error' }),
    );
  });

  it('ignores unknown events and acks them', async () => {
    const { runner, dispatcher } = setup();
    dispatcher.register(GenerateReport, () => undefined);
    const response = await runner.handleLambdaEvent({
      Records: [record('evt', body(TaskClosed.type, { taskId: 't' }, 'e-1'))],
    });
    expect(response.batchItemFailures).toEqual([]);
  });

  it('stops a FIFO batch at the first failure to keep the order', async () => {
    const { runner, dispatcher, calls } = setup('ledger-projection');
    const handled: string[] = [];
    dispatcher.register(LedgerPosted, (data) => {
      handled.push(data.accountId);
      if (data.accountId === 'a-2') throw transient();
    });

    const response = await runner.handleLambdaEvent({
      Records: [
        record(
          'm1',
          body(LedgerPosted.type, { accountId: 'a-1', amount: 1 }, 'e-1'),
          1,
          'a-1',
        ),
        record(
          'm2',
          body(LedgerPosted.type, { accountId: 'a-2', amount: 1 }, 'e-2'),
          1,
          'a-2',
        ),
        record(
          'm3',
          body(LedgerPosted.type, { accountId: 'a-3', amount: 1 }, 'e-3'),
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
    expect(
      calls('ChangeMessageVisibilityCommand').map((c) => c['ReceiptHandle']),
    ).toEqual(['rh-m2', 'rh-m3']);
    expect(calls('ChangeMessageVisibilityCommand')[0]?.['QueueUrl']).toBe(
      'https://sqs.local/test-ledger-projection.fifo',
    );
  });

  it('dead-letters a FIFO message with its group and deduplication id', async () => {
    const { runner, dispatcher, calls } = setup('ledger-projection');
    dispatcher.register(LedgerPosted, () => {
      throw new PermanentMessageError('cannot project');
    });
    await runner.handleLambdaEvent({
      Records: [
        record(
          'm1',
          body(LedgerPosted.type, { accountId: 'a-1', amount: 1 }, 'e-1'),
          1,
          'a-1',
        ),
      ],
    });
    expect(calls('SendMessageCommand')[0]).toMatchObject({
      QueueUrl: 'https://sqs.local/test-ledger-projection-dlq.fifo',
      MessageGroupId: 'a-1',
      MessageDeduplicationId: 'm1',
    });
  });

  it('dead-letters at the last attempt of the contract policy', async () => {
    const { runner, dispatcher, calls } = setup();
    dispatcher.register(GenerateReport, () => {
      throw transient();
    });
    const response = await runner.handleLambdaEvent({
      Records: [
        record('last', body(GenerateReport.type, { reportId: 'r' }, 'e-1'), 3),
      ],
    });
    expect(response.batchItemFailures).toEqual([]);
    expect(calls('SendMessageCommand')).toHaveLength(1);
  });

  it('reports the action and the dispatch result of each delivery', async () => {
    const { runner, dispatcher } = setup();
    dispatcher.register(GenerateReport, () => undefined);
    const reports = await runner.process([
      {
        messageId: 'a',
        receiptHandle: 'rh-a',
        body: body(GenerateReport.type, { reportId: 'r' }, 'e-1'),
        receiveCount: 1,
      },
    ]);
    expect(reports).toEqual([
      {
        messageId: 'a',
        action: DeliveryAction.Acknowledge,
        result: { outcome: 'processed', id: 'e-1' },
      },
    ]);
  });

  it('refuses a queue that is not in the topology', () => {
    expect(() => setup('missing')).toThrow(
      expect.objectContaining({ code: MessagingErrorCode.UnknownQueue }),
    );
  });
});

describe('SqsDeliveryRunner with long polling', () => {
  it('receives, dispatches and deletes the acknowledged messages', async () => {
    let served = false;
    const { runner, dispatcher, calls } = setup(
      'reports-work',
      (name, input) => {
        if (name === 'GetQueueUrlCommand') {
          return {
            QueueUrl: `https://sqs.local/${String(input['QueueName'])}`,
          };
        }
        if (name === 'ReceiveMessageCommand' && !served) {
          served = true;
          return {
            Messages: [
              {
                MessageId: 'ok',
                ReceiptHandle: 'rh-ok',
                Body: body(GenerateReport.type, { reportId: 'r-1' }, 'e-1'),
                Attributes: { ApproximateReceiveCount: '1' },
              },
              {
                MessageId: 'retry',
                ReceiptHandle: 'rh-retry',
                Body: body(GenerateReport.type, { reportId: 'flaky' }, 'e-2'),
                Attributes: { ApproximateReceiveCount: '1' },
              },
            ],
          };
        }
        return {};
      },
    );
    dispatcher.register(GenerateReport, (data) => {
      if (data.reportId === 'flaky') throw transient();
    });

    expect(await runner.pollOnce()).toEqual({
      received: 2,
      acknowledged: 1,
      redelivered: 1,
    });
    expect(calls('ReceiveMessageCommand')[0]).toMatchObject({
      QueueUrl: 'https://sqs.local/test-reports-work',
      MaxNumberOfMessages: 10,
      WaitTimeSeconds: 1,
      MessageSystemAttributeNames: [
        'ApproximateReceiveCount',
        'MessageGroupId',
      ],
    });
    expect(calls('DeleteMessageBatchCommand')).toEqual([
      {
        QueueUrl: 'https://sqs.local/test-reports-work',
        Entries: [{ Id: '0', ReceiptHandle: 'rh-ok' }],
      },
    ]);
    expect(await runner.pollOnce()).toEqual({
      received: 0,
      acknowledged: 0,
      redelivered: 0,
    });
  });

  it('keeps polling after an error and stops when asked', async () => {
    let receives = 0;
    const { runner, logger } = setup('reports-work', (name, input, options) => {
      if (name === 'GetQueueUrlCommand') {
        return { QueueUrl: `https://sqs.local/${String(input['QueueName'])}` };
      }
      if (name === 'ReceiveMessageCommand') {
        receives++;
        if (receives === 1) throw new Error('network');
        return new Promise((resolve, reject) => {
          options?.abortSignal?.addEventListener('abort', () =>
            reject(Object.assign(new Error('aborted'), { name: 'AbortError' })),
          );
          setTimeout(() => resolve({}), 5);
        });
      }
      return {};
    });

    runner.start();
    await new Promise((resolve) => setTimeout(resolve, 30));
    await runner.stop();

    expect(receives).toBeGreaterThan(1);
    expect(logger.lines[0]).toMatchObject({
      level: 'error',
      message: 'sqs polling failed',
      fields: { error_code: MessagingErrorCode.TransportFailed },
    });
  });

  it('validates its options', () => {
    expect(
      () =>
        new SqsDeliveryRunner({
          sqs: {} as SQSClient,
          names: {} as AwsMessagingNames,
          dispatcher: {} as MessageDispatcher,
          topology,
          queue: 'reports-work',
          logger: new RecordingLogger(),
          batchSize: 11,
        }),
    ).toThrow(
      expect.objectContaining({ code: MessagingErrorCode.InvalidOptions }),
    );
  });
});
