import {
  ChangeMessageVisibilityCommand,
  type SQSClient,
} from '@aws-sdk/client-sqs';
import {
  DispatchOutcome,
  type DispatchResult,
  type MessageDispatcher,
  type QueueDef,
} from '@platform/messaging';
import { ErrorDescriptor } from '@platform/kernel';
import type { LoggerPort } from '@platform/observability';
import type { AwsErrorTranslator } from './aws-error-translator.js';
import type { AwsMessagingNames } from './aws-messaging-names.js';
import { AwsOperation } from './aws-operation.enum.js';
import { DeliveryAction } from './delivery-action.enum.js';
import type { DeliveryReport } from './delivery-report.js';
import { SqsConsumerConfig } from './sqs-consumer-config.js';
import type { SqsDeadLetterRedriver } from './sqs-dead-letter-redriver.js';
import type { SqsDelivery } from './sqs-delivery.js';

/**
 * Dispatches a batch of deliveries from an SQS queue with the `MessageDispatcher` and
 * applies what it decides (acknowledge, adjust the visibility, copy to the
 * DLQ). Shared by `SqsPoller` and `SqsLambdaHandler`. It does not delete the
 * acknowledged ones: the caller does that.
 *
 * - `Processed`, `Duplicate` and `Ignored`: acknowledged.
 * - `RetryLater` and `InProgress`: the visibility is adjusted to the dispatcher's
 *   backoff and the delivery is left for another round. The queue's redrive policy
 *   sends it to the DLQ when it exceeds `maxReceiveCount`.
 * - `DeadLetter`: copied to the DLQ with the reason and acknowledged. If the copy
 *   fails, it is left for another round.
 *
 * In FIFO queues, after the first delivery that is not acknowledged, the rest of the
 * batch goes back to the queue without being dispatched: so the group order is not broken.
 */
export class SqsDeliveryProcessor {
  constructor(
    private readonly sqs: SQSClient,
    private readonly names: AwsMessagingNames,
    private readonly dispatcher: MessageDispatcher,
    private readonly queue: QueueDef,
    private readonly redriver: SqsDeadLetterRedriver,
    private readonly logger: LoggerPort,
    private readonly errors: AwsErrorTranslator,
  ) {}

  /**
   * One `DeliveryReport` per delivery, in the same order.
   * Zero visibility: the delivery comes back immediately for the next attempt.
   */
  async process(deliveries: readonly SqsDelivery[]): Promise<DeliveryReport[]> {
    const reports: DeliveryReport[] = [];
    let halted = false;
    for (const delivery of deliveries) {
      if (halted) {
        reports.push({
          messageId: delivery.messageId,
          action: DeliveryAction.Redeliver,
        });
        await this.changeVisibility(delivery, 0);
        continue;
      }
      const report = await this.handle(delivery);
      reports.push(report);
      if (this.queue.isFifo && report.action === DeliveryAction.Redeliver) {
        halted = true;
      }
    }
    return reports;
  }

  /**
   * The dispatcher reports failures as results: if it throws, it is a bug or an outage.
   */
  private async handle(delivery: SqsDelivery): Promise<DeliveryReport> {
    let result: DispatchResult;
    try {
      result = await this.dispatcher.dispatch(delivery.body, {
        receiveCount: delivery.receiveCount,
        retryPolicy: this.queue.retryPolicy,
        visibilityTimeoutMs: this.queue.visibilityTimeoutSeconds * 1000,
      });
    } catch (err) {
      this.logger.error('dispatcher threw', {
        message_id: delivery.messageId,
        error_code: ErrorDescriptor.codeOf(err),
        error: err,
      });
      return {
        messageId: delivery.messageId,
        action: DeliveryAction.Redeliver,
      };
    }

    switch (result.outcome) {
      case DispatchOutcome.Processed:
      case DispatchOutcome.Duplicate:
      case DispatchOutcome.Ignored:
        return {
          messageId: delivery.messageId,
          action: DeliveryAction.Acknowledge,
          result,
        };
      case DispatchOutcome.RetryLater:
      case DispatchOutcome.InProgress:
        await this.changeVisibility(delivery, result.delayMs);
        return {
          messageId: delivery.messageId,
          action: DeliveryAction.Redeliver,
          result,
        };
      case DispatchOutcome.DeadLetter: {
        const copied = await this.redriver.copy(delivery, result);
        return {
          messageId: delivery.messageId,
          action: copied
            ? DeliveryAction.Acknowledge
            : DeliveryAction.Redeliver,
          result,
        };
      }
    }
  }

  /**
   * Without the change, the message comes back when its current visibility expires.
   */
  private async changeVisibility(
    delivery: SqsDelivery,
    delayMs: number,
  ): Promise<void> {
    const seconds = Math.min(
      SqsConsumerConfig.MAX_VISIBILITY_SECONDS,
      Math.max(0, Math.ceil(delayMs / 1000)),
    );
    try {
      const queueUrl = await this.names.queueUrl(
        this.names.queueName(this.queue.name, this.queue.isFifo),
      );
      await this.sqs.send(
        new ChangeMessageVisibilityCommand({
          QueueUrl: queueUrl,
          ReceiptHandle: delivery.receiptHandle,
          VisibilityTimeout: seconds,
        }),
      );
    } catch (err) {
      const error = this.errors.translate(
        AwsOperation.ChangeMessageVisibility,
        err,
        this.queue.name,
      );
      this.logger.warn('could not change message visibility', {
        message_id: delivery.messageId,
        error_code: error.code,
        error,
      });
    }
  }
}
