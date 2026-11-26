import { SendMessageCommand, type SQSClient } from '@aws-sdk/client-sqs';
import type { QueueDef } from '@platform/messaging';
import type { LoggerPort } from '@platform/observability';
import type { AwsErrorTranslator } from './aws-error-translator.js';
import type { AwsMessagingNames } from './aws-messaging-names.js';
import { AwsOperation } from './aws-operation.enum.js';
import { DeadLetterAttribute } from './dead-letter-attribute.enum.js';
import type { DeadLetterResult } from './delivery-report.js';
import { SqsConsumerConfig } from './sqs-consumer-config.js';
import type { SqsDelivery } from './sqs-delivery.js';

/**
 * Copies to the queue's DLQ a message the dispatcher declared lost
 * (permanent error, broken contract, invalid tenant), with the reason in attributes.
 */
export class SqsDeadLetterRedriver {
  constructor(
    private readonly sqs: SQSClient,
    private readonly names: AwsMessagingNames,
    private readonly queue: QueueDef,
    private readonly logger: LoggerPort,
    private readonly errors: AwsErrorTranslator,
  ) {}

  /**
   * `true` if the message ended up in the DLQ; `false` if the copy failed and the delivery must be retried.
   * The FIFO DLQ requires a group and deduplication; the message id serves as the group when the original did not have one.
   * @param delivery Delivery to copy.
   * @param result Reason it is dead.
   * @returns Whether it reached the DLQ.
   */
  async copy(
    delivery: SqsDelivery,
    result: DeadLetterResult,
  ): Promise<boolean> {
    const fifo = this.queue.isFifo;
    try {
      const queueUrl = await this.names.queueUrl(
        this.names.deadLetterQueueName(this.queue.name, fifo),
      );
      await this.sqs.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: delivery.body,
          MessageAttributes: this.attributes(result),
          ...(fifo
            ? {
                MessageGroupId: delivery.groupId ?? delivery.messageId,
                MessageDeduplicationId: delivery.messageId,
              }
            : {}),
        }),
      );
      this.logger.warn('message dead-lettered', {
        message_id: delivery.messageId,
        error_code: result.code,
      });
      return true;
    } catch (err) {
      const error = this.errors.translate(
        AwsOperation.SendMessage,
        err,
        this.queue.name,
      );
      this.logger.error('could not copy the message to the dead-letter queue', {
        message_id: delivery.messageId,
        error_code: error.code,
        error,
      });
      return false;
    }
  }

  private attributes(result: DeadLetterResult) {
    return {
      [DeadLetterAttribute.Error]: {
        DataType: 'String',
        StringValue:
          result.error.slice(0, SqsConsumerConfig.MAX_ERROR_ATTRIBUTE_LENGTH) ||
          '-',
      },
      [DeadLetterAttribute.SourceQueue]: {
        DataType: 'String',
        StringValue: this.queue.name,
      },
      ...(result.code === undefined
        ? {}
        : {
            [DeadLetterAttribute.ErrorCode]: {
              DataType: 'String',
              StringValue: result.code,
            },
          }),
    };
  }
}
