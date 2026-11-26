import { GetQueueUrlCommand } from '@aws-sdk/client-sqs';
import { MessagingErrorCode } from '@platform/messaging';
import { AwsErrorTranslator } from '../aws-error-translator.js';
import { AwsMessagingNames } from '../aws-messaging-names.js';
import { FakeSqsClient } from './utils/fake-sqs-client.js';
import { AWS_TEST_SETTINGS } from './utils/aws-test-settings.js';

describe('AwsMessagingNames', () => {
  it('builds the physical names that Terraform creates', () => {
    const names = new AwsMessagingNames(
      AWS_TEST_SETTINGS,
      new FakeSqsClient(),
      new AwsErrorTranslator(),
    );

    expect(names.topicName('tasks-events', false)).toBe('test-tasks-events');
    expect(names.queueName('reports-work', false)).toBe('test-reports-work');
    expect(names.queueName('ledger-projection', true)).toBe(
      'test-ledger-projection.fifo',
    );
    expect(names.deadLetterQueueName('reports-work', false)).toBe(
      'test-reports-work-dlq',
    );
    expect(names.deadLetterQueueName('ledger-projection', true)).toBe(
      'test-ledger-projection-dlq.fifo',
    );
  });

  it.each([
    ['reports-work', false],
    ['ledger-projection', true],
  ])('names %s with the shared physical name rule', (name, fifo) => {
    const names = new AwsMessagingNames(
      AWS_TEST_SETTINGS,
      new FakeSqsClient(),
      new AwsErrorTranslator(),
    );
    const physical = AwsMessagingNames.physicalName(
      AWS_TEST_SETTINGS.MESSAGING_NAME_PREFIX,
      name,
      fifo,
    );

    expect(names.queueName(name, fifo)).toBe(physical);
    expect(names.topicName(name, fifo)).toBe(physical);
  });

  it.each([
    ['us-east-1', 'arn:aws:sns:us-east-1:000000000000:test-ledger-events.fifo'],
    [
      'cn-north-1',
      'arn:aws-cn:sns:cn-north-1:000000000000:test-ledger-events.fifo',
    ],
    [
      'us-gov-west-1',
      'arn:aws-us-gov:sns:us-gov-west-1:000000000000:test-ledger-events.fifo',
    ],
  ])('builds the topic ARN in the partition of %s', (region, expected) => {
    const names = new AwsMessagingNames(
      { ...AWS_TEST_SETTINGS, AWS_REGION: region },
      new FakeSqsClient(),
      new AwsErrorTranslator(),
    );
    expect(names.topicArn('ledger-events', true)).toBe(expected);
  });

  it('caches the queue URL after the first lookup', async () => {
    const sqs = new FakeSqsClient().on(GetQueueUrlCommand, (input) => ({
      QueueUrl: `https://sqs.local/${input.QueueName}`,
    }));
    const names = new AwsMessagingNames(
      AWS_TEST_SETTINGS,
      sqs,
      new AwsErrorTranslator(),
    );

    await expect(names.queueUrl('test-reports-work')).resolves.toBe(
      'https://sqs.local/test-reports-work',
    );
    await names.queueUrl('test-reports-work');

    expect(sqs.sentOf(GetQueueUrlCommand)).toHaveLength(1);
  });

  it('translates a failed lookup and does not cache it', async () => {
    const sqs = new FakeSqsClient()
      .once(GetQueueUrlCommand, () => {
        throw Object.assign(new Error('boom'), {
          name: 'TimeoutError',
          $fault: 'server',
        });
      })
      .on(GetQueueUrlCommand, (input) => ({
        QueueUrl: `https://sqs.local/${input.QueueName}`,
      }));
    const names = new AwsMessagingNames(
      AWS_TEST_SETTINGS,
      sqs,
      new AwsErrorTranslator(),
    );

    await expect(names.queueUrl('test-reports-work')).rejects.toMatchObject({
      code: MessagingErrorCode.TransportFailed,
      retryable: true,
    });
    await expect(names.queueUrl('test-reports-work')).resolves.toBe(
      'https://sqs.local/test-reports-work',
    );
    expect(sqs.sentOf(GetQueueUrlCommand)).toHaveLength(2);
  });
});
