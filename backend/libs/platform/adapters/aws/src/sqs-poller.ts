import {
  DeleteMessageBatchCommand,
  type Message,
  MessageSystemAttributeName,
  ReceiveMessageCommand,
  type SQSClient,
} from '@aws-sdk/client-sqs';
import { Deadline } from '@platform/primitives';
import { type Clock, ErrorDescriptor } from '@platform/kernel';
import type { QueueDef } from '@platform/messaging';
import type { LoggerPort } from '@platform/observability';
import type { AwsErrorTranslator } from './aws-error-translator.js';
import type { AwsMessagingNames } from './aws-messaging-names.js';
import { AwsOperation } from './aws-operation.enum.js';
import { DeliveryAction } from './delivery-action.enum.js';
import type { PollReport } from './delivery-report.js';
import { SqsConsumerConfig } from './sqs-consumer-config.js';
import { SqsDeliveryMapper } from './sqs-delivery-mapper.js';
import type { SqsDelivery } from './sqs-delivery.js';
import type { SqsDeliveryProcessor } from './sqs-delivery-processor.js';

/** Consumes an SQS queue with long polling (service mode, Fargate). */
export class SqsPoller {
  private loop: Promise<void> | undefined;
  private abort: AbortController | undefined;

  constructor(
    private readonly sqs: SQSClient,
    private readonly names: AwsMessagingNames,
    private readonly processor: SqsDeliveryProcessor,
    private readonly queue: QueueDef,
    private readonly config: SqsConsumerConfig,
    private readonly logger: LoggerPort,
    private readonly errors: AwsErrorTranslator,
    private readonly clock: Clock,
  ) {}

  /**
   * One round of long polling: receives, processes and deletes the acknowledged ones.
   * @param signal Abort signal.
   * @returns The poll report.
   */
  async pollOnce(signal?: AbortSignal): Promise<PollReport> {
    const queueUrl = await this.names.queueUrl(
      this.names.queueName(this.queue.name, this.queue.isFifo),
    );
    let messages: Message[];
    try {
      const output = await this.sqs.send(
        new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: this.config.batchSize,
          WaitTimeSeconds: this.config.waitTimeSeconds,
          MessageSystemAttributeNames: [
            MessageSystemAttributeName.ApproximateReceiveCount,
            MessageSystemAttributeName.MessageGroupId,
          ],
        }),
        signal === undefined ? {} : { abortSignal: signal },
      );
      messages = output.Messages ?? [];
    } catch (err) {
      throw this.errors.translate(
        AwsOperation.ReceiveMessage,
        err,
        this.queue.name,
      );
    }

    const deliveries = messages
      .map((message) => SqsDeliveryMapper.fromMessage(message))
      .filter((delivery): delivery is SqsDelivery => delivery !== undefined);
    const reports = await this.processor.process(deliveries);
    const acknowledged = deliveries.filter(
      (_, index) => reports[index]?.action === DeliveryAction.Acknowledge,
    );
    await this.delete(queueUrl, acknowledged);
    return {
      received: deliveries.length,
      acknowledged: acknowledged.length,
      redelivered: deliveries.length - acknowledged.length,
    };
  }

  /** Starts the long polling loop. Does nothing if it is already running. */
  start(): void {
    if (this.loop) return;
    const abort = new AbortController();
    this.abort = abort;
    this.loop = this.run(abort.signal);
  }

  /** Cuts the long polling wait and lets the current batch finish. */
  async stop(): Promise<void> {
    this.abort?.abort();
    await this.loop;
    this.loop = undefined;
    this.abort = undefined;
  }

  /**
   * Waits before retrying. The timeout is generous: only the pause matters, and cancellation arrives through `signal`.
   */
  private async run(signal: AbortSignal): Promise<void> {
    while (!signal.aborted) {
      try {
        await this.pollOnce(signal);
      } catch (err) {
        if (signal.aborted) return;
        this.reportFailure(err);
        await Deadline.after(this.config.errorDelayMs * 2 + 1_000, this.clock)
          .sleep(this.config.errorDelayMs, signal)
          .catch(() => undefined);
      }
    }
  }

  /**
   * A logger failure cannot end the consumption loop.
   */
  private reportFailure(err: unknown): void {
    try {
      this.logger.error('sqs polling failed', {
        error_code: ErrorDescriptor.codeOf(err),
        error: err,
      });
    } catch {}
  }

  /**
   * Deletes the acknowledged ones in batches of up to 10; a failure is not rethrown, the message comes back later.
   * Messages that come back are absorbed by the processed message registry.
   */
  private async delete(
    queueUrl: string,
    deliveries: readonly SqsDelivery[],
  ): Promise<void> {
    for (
      let start = 0;
      start < deliveries.length;
      start += SqsConsumerConfig.MAX_BATCH_SIZE
    ) {
      const chunk = deliveries.slice(
        start,
        start + SqsConsumerConfig.MAX_BATCH_SIZE,
      );
      try {
        const output = await this.sqs.send(
          new DeleteMessageBatchCommand({
            QueueUrl: queueUrl,
            Entries: chunk.map((delivery, index) => ({
              Id: String(index),
              ReceiptHandle: delivery.receiptHandle,
            })),
          }),
        );
        for (const failed of output.Failed ?? []) {
          this.logger.warn('could not delete a processed message', {
            message_id: chunk[Number(failed.Id)]?.messageId,
            error_code: failed.Code,
            error_message: failed.Message,
          });
        }
      } catch (err) {
        const error = this.errors.translate(
          AwsOperation.DeleteMessageBatch,
          err,
          this.queue.name,
        );
        this.logger.warn('could not delete processed messages', {
          error_code: error.code,
          error,
        });
      }
    }
  }
}
