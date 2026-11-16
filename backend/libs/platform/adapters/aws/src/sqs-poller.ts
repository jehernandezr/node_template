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

/** Consume una cola SQS con long polling (modo servicio, Fargate). */
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

  /** Una vuelta de long polling: recibe, procesa y borra los confirmados. */
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

  /** Arranca el ciclo de long polling. No hace nada si ya corre. */
  start(): void {
    if (this.loop) return;
    const abort = new AbortController();
    this.abort = abort;
    this.loop = this.run(abort.signal);
  }

  /** Corta la espera del long polling y deja terminar el lote en curso. */
  async stop(): Promise<void> {
    this.abort?.abort();
    await this.loop;
    this.loop = undefined;
    this.abort = undefined;
  }

  private async run(signal: AbortSignal): Promise<void> {
    while (!signal.aborted) {
      try {
        await this.pollOnce(signal);
      } catch (err) {
        if (signal.aborted) return;
        this.reportFailure(err);
        // Espera antes de reintentar. El plazo es holgado: solo importa la pausa,
        // y la cancelación llega por `signal`.
        await Deadline.after(this.config.errorDelayMs * 2 + 1_000, this.clock)
          .sleep(this.config.errorDelayMs, signal)
          .catch(() => undefined);
      }
    }
  }

  private reportFailure(err: unknown): void {
    try {
      this.logger.error('sqs polling failed', {
        error_code: ErrorDescriptor.codeOf(err),
        error: err,
      });
    } catch {
      // Un fallo del logger no puede terminar el ciclo de consumo.
    }
  }

  /** Borra los confirmados en lotes de hasta 10; un fallo no se relanza, el mensaje vuelve después. */
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
        // Los mensajes que vuelvan los absorbe el registro de mensajes procesados.
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
