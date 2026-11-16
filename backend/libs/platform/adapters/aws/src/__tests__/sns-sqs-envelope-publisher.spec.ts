import { GetQueueUrlCommand, SendMessageCommand } from '@aws-sdk/client-sqs';
import { PublishCommand } from '@aws-sdk/client-sns';
import { MessagingErrorCode, TargetKind } from '@platform/messaging';
import { AwsErrorTranslator } from '../aws-error-translator.js';
import { AwsMessagingNames } from '../aws-messaging-names.js';
import { SnsSqsEnvelopePublisher } from '../sns-sqs-envelope-publisher.js';
import { AWS_TEST_SETTINGS } from './utils/aws-test-settings.js';
import { EnvelopeBody } from './utils/envelope-body.js';
import { FakeSnsClient } from './utils/fake-sns-client.js';
import { FakeSqsClient } from './utils/fake-sqs-client.js';
import { TaskClosed } from './utils/test-contracts.js';

function setup() {
  const sns = new FakeSnsClient();
  const sqs = new FakeSqsClient().on(GetQueueUrlCommand, (input) => ({
    QueueUrl: `https://sqs.local/${input.QueueName}`,
  }));
  const errors = new AwsErrorTranslator();
  const names = new AwsMessagingNames(AWS_TEST_SETTINGS, sqs, errors);
  const publisher = new SnsSqsEnvelopePublisher(sns, sqs, names, errors);
  return { sns, sqs, publisher };
}

const bodies = new EnvelopeBody();

describe('SnsSqsEnvelopePublisher', () => {
  it('publishes events to the topic ARN with the envelope as body', async () => {
    const { publisher, sns } = setup();
    const message = bodies.envelope(TaskClosed.type, { taskId: 't-1' });

    await publisher.publish(message, {
      kind: TargetKind.Topic,
      name: 'tasks-events',
      fifo: false,
    });

    expect(sns.sentOf(PublishCommand)[0]?.input).toEqual({
      TopicArn: 'arn:aws:sns:us-east-1:000000000000:test-tasks-events',
      Message: JSON.stringify(message),
    });
  });

  it('sends the group and the envelope id as deduplication id to FIFO topics', async () => {
    const { publisher, sns } = setup();
    const message = bodies.envelope(TaskClosed.type, { taskId: 't-9' });

    await publisher.publish(
      message,
      { kind: TargetKind.Topic, name: 'ledger-events', fifo: true },
      { groupId: 'acc-1' },
    );

    expect(sns.sentOf(PublishCommand)[0]?.input).toMatchObject({
      TopicArn: 'arn:aws:sns:us-east-1:000000000000:test-ledger-events.fifo',
      MessageGroupId: 'acc-1',
      MessageDeduplicationId: message.id,
    });
  });

  it('rejects a FIFO topic publish without a group', async () => {
    const { publisher, sns } = setup();

    await expect(
      publisher.publish(bodies.envelope(TaskClosed.type, {}), {
        kind: TargetKind.Topic,
        name: 'ledger-events',
        fifo: true,
      }),
    ).rejects.toMatchObject({ code: MessagingErrorCode.InvalidOptions });
    expect(sns.sentOf(PublishCommand)).toHaveLength(0);
  });

  it('sends commands to the queue URL with their delay in seconds', async () => {
    const { publisher, sqs } = setup();

    await publisher.publish(
      bodies.envelope(TaskClosed.type, {}),
      { kind: TargetKind.Queue, name: 'reports-work', fifo: false },
      { delayMs: 1_500 },
    );

    expect(sqs.sentOf(SendMessageCommand)[0]?.input).toMatchObject({
      QueueUrl: 'https://sqs.local/test-reports-work',
      DelaySeconds: 2,
    });
  });

  it('caps the delay of a command at the 900 seconds of SQS', async () => {
    const { publisher, sqs } = setup();

    await publisher.publish(
      bodies.envelope(TaskClosed.type, {}),
      { kind: TargetKind.Queue, name: 'reports-work', fifo: false },
      { delayMs: 2_000_000 },
    );

    expect(sqs.sentOf(SendMessageCommand)[0]?.input).toMatchObject({
      DelaySeconds: 900,
    });
  });

  it('translates a failed topic publish, retryable unless the client is at fault', async () => {
    const { publisher, sns } = setup();
    sns.once(PublishCommand, () => {
      throw Object.assign(new Error('denied'), {
        name: 'AuthorizationErrorException',
        $fault: 'client',
      });
    });

    await expect(
      publisher.publish(bodies.envelope(TaskClosed.type, {}), {
        kind: TargetKind.Topic,
        name: 'tasks-events',
      }),
    ).rejects.toMatchObject({
      code: MessagingErrorCode.TransportFailed,
      retryable: false,
      message: expect.stringContaining('sns:Publish'),
    });
  });

  it('translates a failed queue send with the SendMessage operation', async () => {
    const { publisher, sqs } = setup();
    sqs.once(SendMessageCommand, () => {
      throw Object.assign(new Error('down'), {
        name: 'ServiceUnavailable',
        $fault: 'server',
      });
    });

    await expect(
      publisher.publish(bodies.envelope(TaskClosed.type, {}), {
        kind: TargetKind.Queue,
        name: 'reports-work',
        fifo: false,
      }),
    ).rejects.toMatchObject({
      code: MessagingErrorCode.TransportFailed,
      retryable: true,
      message: expect.stringContaining('sqs:SendMessage'),
    });
  });
});
