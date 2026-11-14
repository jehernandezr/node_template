import type { SNSClient } from '@aws-sdk/client-sns';
import type { SQSClient } from '@aws-sdk/client-sqs';
import { ConfigValidationError } from '@platform/config';
import {
  createEnvelope,
  type EnvelopePublisher,
  MessagingErrorCode,
  TargetKind,
  topologyFromContracts,
} from '@platform/messaging';
import {
  awsTestConfig,
  fakeClient,
  GenerateReport,
  ledgerContract,
  LedgerPosted,
  reportsContract,
  tasksContract,
} from '../test/fixtures.js';
import { awsConfig } from './aws-config.js';
import { isRetryableAwsError } from './aws-errors.js';
import { AwsMessagingNames, partitionOf } from './messaging-names.js';
import { SnsSqsEnvelopePublisher } from './sns-sqs-envelope-publisher.js';
import { SnsSqsMessageBus } from './sns-sqs-message-bus.js';

function envelope(id = 'm-1') {
  return createEnvelope(
    { type: 'tasks.task.closed.v1', source: '/test', data: { taskId: 't-1' } },
    { newId: () => id },
  );
}

function setup(
  sqsRespond: Parameters<typeof fakeClient>[0] = (name, input) =>
    name === 'GetQueueUrlCommand'
      ? { QueueUrl: `https://sqs.local/${String(input['QueueName'])}` }
      : {},
) {
  const sns = fakeClient();
  const sqs = fakeClient(sqsRespond);
  const names = new AwsMessagingNames(
    awsTestConfig,
    sqs.client as unknown as SQSClient,
  );
  const publisher = new SnsSqsEnvelopePublisher({
    sns: sns.client as unknown as SNSClient,
    sqs: sqs.client as unknown as SQSClient,
    names,
  });
  return { sns, sqs, names, publisher };
}

describe('awsConfig', () => {
  const env = {
    AWS_REGION: 'us-east-1',
    AWS_ENDPOINT_URL: 'http://localhost:4566',
    AWS_ACCOUNT_ID: '000000000000',
    MESSAGING_NAME_PREFIX: 'platform-local',
  };

  it('loads the region, the LocalStack endpoint and the naming', () => {
    expect(awsConfig.load(env)).toEqual(env);
    expect(awsConfig.load({ ...env, AWS_ENDPOINT_URL: '' })).toEqual({
      AWS_REGION: env.AWS_REGION,
      AWS_ACCOUNT_ID: env.AWS_ACCOUNT_ID,
      MESSAGING_NAME_PREFIX: env.MESSAGING_NAME_PREFIX,
    });
  });

  it('rejects a missing account and a malformed region', () => {
    expect(() => awsConfig.load({ ...env, AWS_ACCOUNT_ID: '' })).toThrow(
      ConfigValidationError,
    );
    expect(() => awsConfig.load({ ...env, AWS_REGION: 'nowhere' })).toThrow(
      ConfigValidationError,
    );
  });
});

describe('AwsMessagingNames', () => {
  it('builds the physical names Terraform creates', () => {
    const { names } = setup();
    expect(names.topicName('tasks-events', false)).toBe('test-tasks-events');
    expect(names.queueName('ledger-projection', true)).toBe(
      'test-ledger-projection.fifo',
    );
    expect(names.deadLetterQueueName('ledger-projection', true)).toBe(
      'test-ledger-projection-dlq.fifo',
    );
    expect(names.topicArn('ledger-events', true)).toBe(
      'arn:aws:sns:us-east-1:000000000000:test-ledger-events.fifo',
    );
    expect(partitionOf('cn-north-1')).toBe('aws-cn');
    expect(partitionOf('us-gov-west-1')).toBe('aws-us-gov');
  });

  it('caches queue URLs, but not failures', async () => {
    let fail = true;
    const { names, sqs } = setup(() => {
      if (fail) {
        fail = false;
        throw Object.assign(new Error('boom'), { name: 'TimeoutError' });
      }
      return { QueueUrl: 'https://sqs.local/q' };
    });
    await expect(names.queueUrl('test-q')).rejects.toMatchObject({
      code: MessagingErrorCode.TransportFailed,
      retryable: true,
    });
    await expect(names.queueUrl('test-q')).resolves.toBe('https://sqs.local/q');
    await expect(names.queueUrl('test-q')).resolves.toBe('https://sqs.local/q');
    expect(sqs.sent).toHaveLength(2);
  });
});

describe('SnsSqsEnvelopePublisher', () => {
  it('publishes events to the topic ARN with the envelope as body', async () => {
    const { publisher, sns } = setup();
    const message = envelope();
    await publisher.publish(message, {
      kind: TargetKind.Topic,
      name: 'tasks-events',
      fifo: false,
    });
    expect(sns.sent).toEqual([
      {
        name: 'PublishCommand',
        input: {
          TopicArn: 'arn:aws:sns:us-east-1:000000000000:test-tasks-events',
          Message: JSON.stringify(message),
        },
      },
    ]);
  });

  it('sends the group and the deduplication id to FIFO topics', async () => {
    const { publisher, sns } = setup();
    await publisher.publish(
      envelope('m-9'),
      { kind: TargetKind.Topic, name: 'ledger-events', fifo: true },
      { groupId: 'acc-1' },
    );
    expect(sns.sent[0]?.input).toMatchObject({
      TopicArn: 'arn:aws:sns:us-east-1:000000000000:test-ledger-events.fifo',
      MessageGroupId: 'acc-1',
      MessageDeduplicationId: 'm-9',
    });
    await expect(
      publisher.publish(envelope(), {
        kind: TargetKind.Topic,
        name: 'ledger-events',
        fifo: true,
      }),
    ).rejects.toMatchObject({ code: MessagingErrorCode.InvalidOptions });
  });

  it('sends commands to the queue URL with their delay in seconds', async () => {
    const { publisher, sqs } = setup();
    await publisher.publish(
      envelope(),
      { kind: TargetKind.Queue, name: 'reports-work', fifo: false },
      { delayMs: 1_500 },
    );
    expect(sqs.sent.map((c) => c.name)).toEqual([
      'GetQueueUrlCommand',
      'SendMessageCommand',
    ]);
    expect(sqs.sent[1]?.input).toMatchObject({
      QueueUrl: 'https://sqs.local/test-reports-work',
      DelaySeconds: 2,
    });
  });

  it('wraps SDK failures in TRANSPORT_FAILED, retryable unless the client is at fault', async () => {
    const { publisher, sns } = setup();
    sns.client.send.mockRejectedValueOnce(
      Object.assign(new Error('denied'), {
        name: 'AuthorizationErrorException',
        $fault: 'client',
      }),
    );
    await expect(
      publisher.publish(envelope(), {
        kind: TargetKind.Topic,
        name: 'tasks-events',
      }),
    ).rejects.toMatchObject({
      code: MessagingErrorCode.TransportFailed,
      retryable: false,
      message: expect.stringContaining('AuthorizationErrorException'),
    });
    expect(isRetryableAwsError({ $fault: 'server' })).toBe(true);
    expect(
      isRetryableAwsError({
        $fault: 'client',
        $retryable: { throttling: true },
      }),
    ).toBe(true);
    expect(isRetryableAwsError(new Error('socket hang up'))).toBe(true);
  });
});

describe('SnsSqsMessageBus', () => {
  it('validates with the contract and publishes through the publisher', async () => {
    const calls: unknown[] = [];
    const publisher: EnvelopePublisher = {
      publish: (message, target, options) => {
        calls.push({ type: message.type, target, options });
        return Promise.resolve();
      },
    };
    const bus = new SnsSqsMessageBus({
      topology: topologyFromContracts([
        tasksContract,
        reportsContract,
        ledgerContract,
      ]),
      publisher,
      source: '/services/reports',
      traceparent: () => undefined,
    });

    await bus.send(GenerateReport, { reportId: 'r-1' }, { delayMs: 5_000 });
    await bus.publish(
      LedgerPosted,
      { accountId: 'a-1', amount: 3 },
      { groupId: 'a-1' },
    );
    await expect(
      bus.send(GenerateReport, { reportId: 1 as unknown as string }),
    ).rejects.toMatchObject({ code: MessagingErrorCode.InvalidPayload });

    expect(calls).toEqual([
      {
        type: 'reports.report.generate.v1',
        target: { kind: TargetKind.Queue, name: 'reports-work', fifo: false },
        options: { delayMs: 5_000 },
      },
      {
        type: 'ledger.entry.posted.v1',
        target: { kind: TargetKind.Topic, name: 'ledger-events', fifo: true },
        options: { groupId: 'a-1' },
      },
    ]);
  });
});
