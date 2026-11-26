import { PublishCommand, type SNSClient } from '@aws-sdk/client-sns';
import { SendMessageCommand, type SQSClient } from '@aws-sdk/client-sqs';
import {
  EnvelopePublisher,
  type MessageEnvelope,
  MessagingError,
  MessagingErrorCode,
  type OutboundTarget,
  type PublishOutboxOptions,
  TargetKind,
} from '@platform/messaging';
import type { AwsErrorTranslator } from './aws-error-translator.js';
import type { AwsMessagingNames } from './aws-messaging-names.js';
import { AwsOperation } from './aws-operation.enum.js';

/**
 * Publishes an already validated envelope on SNS (events) or SQS (commands). The body
 * is the JSON of the CloudEvents envelope: with `raw_message_delivery` the queue
 * receives it as is and the Terraform filter (`filter_policy_scope =
 * "MessageBody"`) reads its `type` field.
 *
 * For FIFO destinations it sends the group as `MessageGroupId` and the envelope id
 * as `MessageDeduplicationId`, so a relay retry does not duplicate. It is the
 * `EnvelopePublisher` of the outbox relay and the base of `SnsSqsMessageBus`.
 */
export class SnsSqsEnvelopePublisher extends EnvelopePublisher {
  /** SQS no admite retrasos mayores a 15 minutos. */
  private static readonly MAX_DELAY_SECONDS = 900;

  constructor(
    private readonly sns: SNSClient,
    private readonly sqs: SQSClient,
    private readonly names: AwsMessagingNames,
    private readonly errors: AwsErrorTranslator,
  ) {
    super();
  }

  override async publish(
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

    if (target.kind === TargetKind.Topic) {
      const topicArn = this.names.topicArn(target.name, fifo);
      try {
        await this.sns.send(
          new PublishCommand({
            TopicArn: topicArn,
            Message: body,
            ...ordering,
          }),
        );
      } catch (err) {
        throw this.errors.translate(AwsOperation.Publish, err, target.name);
      }
      return;
    }

    const queueUrl = await this.names.queueUrl(
      this.names.queueName(target.name, fifo),
    );
    const delay = fifo ? undefined : this.delaySeconds(options.delayMs);
    try {
      await this.sqs.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: body,
          ...ordering,
          ...(delay === undefined ? {} : { DelaySeconds: delay }),
        }),
      );
    } catch (err) {
      throw this.errors.translate(AwsOperation.SendMessage, err, target.name);
    }
  }

  /** Per-message SQS delay, in seconds (0 to 900). */
  private delaySeconds(delayMs: number | undefined): number | undefined {
    if (!delayMs || delayMs <= 0) return undefined;
    return Math.min(
      SnsSqsEnvelopePublisher.MAX_DELAY_SECONDS,
      Math.ceil(delayMs / 1000),
    );
  }
}
