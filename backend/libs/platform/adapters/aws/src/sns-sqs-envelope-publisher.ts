import { PublishCommand, type SNSClient } from '@aws-sdk/client-sns';
import { SendMessageCommand, type SQSClient } from '@aws-sdk/client-sqs';
import {
  type EnvelopePublisher,
  type MessageEnvelope,
  MessagingError,
  MessagingErrorCode,
  type OutboundTarget,
  type PublishOutboxOptions,
  TargetKind,
} from '@platform/messaging';
import { AwsOperation, transportError } from './aws-errors.js';
import type { AwsMessagingNames } from './messaging-names.js';

/** Dependencias de {@link SnsSqsEnvelopePublisher}. */
export interface SnsSqsEnvelopePublisherOptions {
  readonly sns: SNSClient;
  readonly sqs: SQSClient;
  readonly names: AwsMessagingNames;
}

/** Retraso por mensaje de SQS, en segundos (0 a 900). */
function delaySeconds(delayMs: number | undefined): number | undefined {
  if (!delayMs || delayMs <= 0) return undefined;
  return Math.min(900, Math.ceil(delayMs / 1000));
}

/**
 * Publica un envelope ya validado en SNS (eventos) o SQS (comandos). El cuerpo
 * es el JSON del envelope CloudEvents: con `raw_message_delivery` la cola lo
 * recibe tal cual y el filtro de Terraform (`filter_policy_scope =
 * "MessageBody"`) lee su campo `type`.
 *
 * En destinos FIFO manda `groupId` como `MessageGroupId` y el id del envelope
 * como `MessageDeduplicationId`, así un reintento del relay no duplica. Es el
 * `EnvelopePublisher` del `OutboxRelay` y la base de `SnsSqsMessageBus`.
 */
export class SnsSqsEnvelopePublisher implements EnvelopePublisher {
  private readonly options: SnsSqsEnvelopePublisherOptions;

  constructor(options: SnsSqsEnvelopePublisherOptions) {
    this.options = options;
  }

  async publish(
    envelope: MessageEnvelope,
    target: OutboundTarget,
    options: PublishOutboxOptions = {},
  ): Promise<void> {
    const fifo = target.fifo ?? false;
    if (fifo && options.groupId === undefined) {
      throw new MessagingError(
        MessagingErrorCode.InvalidOptions,
        `the FIFO ${target.kind} "${target.name}" needs a groupId`,
      );
    }
    const ordering = fifo
      ? {
          MessageGroupId: options.groupId,
          MessageDeduplicationId: envelope.id,
        }
      : {};
    const body = JSON.stringify(envelope);
    const { names, sns, sqs } = this.options;

    if (target.kind === TargetKind.Topic) {
      const topicArn = names.topicArn(target.name, fifo);
      try {
        await sns.send(
          new PublishCommand({
            TopicArn: topicArn,
            Message: body,
            ...ordering,
          }),
        );
      } catch (err) {
        throw transportError(AwsOperation.Publish, err, target.name);
      }
      return;
    }

    const queueUrl = await names.queueUrl(names.queueName(target.name, fifo));
    const delay = fifo ? undefined : delaySeconds(options.delayMs);
    try {
      await sqs.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: body,
          ...ordering,
          ...(delay === undefined ? {} : { DelaySeconds: delay }),
        }),
      );
    } catch (err) {
      throw transportError(AwsOperation.SendMessage, err, target.name);
    }
  }
}
