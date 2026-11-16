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
 * Copia a la DLQ de la cola un mensaje que el despachador declaró perdido
 * (error permanente, contrato roto, tenant inválido), con el motivo en atributos.
 */
export class SqsDeadLetterRedriver {
  constructor(
    private readonly sqs: SQSClient,
    private readonly names: AwsMessagingNames,
    private readonly queue: QueueDef,
    private readonly logger: LoggerPort,
    private readonly errors: AwsErrorTranslator,
  ) {}

  /** `true` si el mensaje quedó en la DLQ; `false` si la copia falló y la entrega debe repetirse. */
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
          // La DLQ FIFO exige grupo y deduplicación; el id del mensaje sirve de
          // grupo cuando el original no lo tenía.
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
