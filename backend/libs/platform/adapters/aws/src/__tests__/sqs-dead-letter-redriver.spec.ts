import { GetQueueUrlCommand, SendMessageCommand } from '@aws-sdk/client-sqs';
import { DispatchOutcome, MessagingErrorCode } from '@platform/messaging';
import { AwsErrorTranslator } from '../aws-error-translator.js';
import { AwsMessagingNames } from '../aws-messaging-names.js';
import { DeadLetterAttribute } from '../dead-letter-attribute.enum.js';
import { SqsDeadLetterRedriver } from '../sqs-dead-letter-redriver.js';
import type { SqsDelivery } from '../sqs-delivery.js';
import { AWS_TEST_SETTINGS } from './utils/aws-test-settings.js';
import { FakeSqsClient } from './utils/fake-sqs-client.js';
import { RecordingLogger } from './utils/recording-logger.js';
import { TestTopology } from './utils/test-topology.js';

function setup(queueName: string) {
  const sqs = new FakeSqsClient().on(GetQueueUrlCommand, (input) => ({
    QueueUrl: `https://sqs.local/${input.QueueName}`,
  }));
  const errors = new AwsErrorTranslator();
  const names = new AwsMessagingNames(AWS_TEST_SETTINGS, sqs, errors);
  const logger = new RecordingLogger();
  const redriver = new SqsDeadLetterRedriver(
    sqs,
    names,
    TestTopology.queue(queueName),
    logger,
    errors,
  );
  return { sqs, redriver, logger };
}

const delivery: SqsDelivery = {
  messageId: 'm-1',
  receiptHandle: 'rh-1',
  body: '{"type":"reports.report.generate.v1"}',
  receiveCount: 3,
};

const deadLetter = {
  outcome: DispatchOutcome.DeadLetter,
  error: 'template missing',
  code: MessagingErrorCode.PermanentError,
} as const;

describe('SqsDeadLetterRedriver', () => {
  it('copies the body to the DLQ with the reason in attributes', async () => {
    const { sqs, redriver, logger } = setup('reports-work');

    expect(await redriver.copy(delivery, deadLetter)).toBe(true);

    expect(sqs.sentOf(SendMessageCommand)[0]?.input).toEqual({
      QueueUrl: 'https://sqs.local/test-reports-work-dlq',
      MessageBody: delivery.body,
      MessageAttributes: {
        [DeadLetterAttribute.Error]: {
          DataType: 'String',
          StringValue: 'template missing',
        },
        [DeadLetterAttribute.SourceQueue]: {
          DataType: 'String',
          StringValue: 'reports-work',
        },
        [DeadLetterAttribute.ErrorCode]: {
          DataType: 'String',
          StringValue: MessagingErrorCode.PermanentError,
        },
      },
    });
    expect(logger.lines).toContainEqual(
      expect.objectContaining({
        level: 'warn',
        message: 'message dead-lettered',
      }),
    );
  });

  it('sends the group and deduplication id to a FIFO DLQ', async () => {
    const { sqs, redriver } = setup('ledger-projection');

    await redriver.copy({ ...delivery, groupId: 'a-1' }, deadLetter);

    expect(sqs.sentOf(SendMessageCommand)[0]?.input).toMatchObject({
      QueueUrl: 'https://sqs.local/test-ledger-projection-dlq.fifo',
      MessageGroupId: 'a-1',
      MessageDeduplicationId: 'm-1',
    });
  });

  it('uses the message id as group when the delivery has none', async () => {
    const { sqs, redriver } = setup('ledger-projection');

    await redriver.copy(delivery, deadLetter);

    expect(sqs.sentOf(SendMessageCommand)[0]?.input).toMatchObject({
      MessageGroupId: 'm-1',
    });
  });

  it('truncates the reason and uses a dash when it is empty', async () => {
    const { sqs, redriver } = setup('reports-work');

    await redriver.copy(delivery, { ...deadLetter, error: 'x'.repeat(2_000) });
    await redriver.copy(delivery, { ...deadLetter, error: '' });

    const [long, empty] = sqs
      .sentOf(SendMessageCommand)
      .map((command) => command.input);
    expect(long).toMatchObject({
      MessageAttributes: {
        [DeadLetterAttribute.Error]: { StringValue: 'x'.repeat(1_024) },
      },
    });
    expect(empty).toMatchObject({
      MessageAttributes: {
        [DeadLetterAttribute.Error]: { StringValue: '-' },
      },
    });
  });

  it('omits the error code attribute when the result has none', async () => {
    const { sqs, redriver } = setup('reports-work');

    await redriver.copy(delivery, {
      outcome: DispatchOutcome.DeadLetter,
      error: 'broken',
    });

    expect(sqs.sentOf(SendMessageCommand)[0]?.input).toMatchObject({
      MessageAttributes: expect.not.objectContaining({
        [DeadLetterAttribute.ErrorCode]: expect.anything(),
      }),
    });
  });

  it('returns false and logs when the copy fails', async () => {
    const { sqs, redriver, logger } = setup('reports-work');
    sqs.on(SendMessageCommand, () => {
      throw Object.assign(new Error('throttled'), { name: 'Throttling' });
    });

    expect(await redriver.copy(delivery, deadLetter)).toBe(false);
    expect(logger.lines).toContainEqual(
      expect.objectContaining({
        level: 'error',
        message: 'could not copy the message to the dead-letter queue',
        fields: expect.objectContaining({
          message_id: 'm-1',
          error_code: MessagingErrorCode.TransportFailed,
        }),
      }),
    );
  });
});
