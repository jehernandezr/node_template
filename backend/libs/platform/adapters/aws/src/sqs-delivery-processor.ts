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
 * Despacha un lote de entregas de una cola SQS con el `MessageDispatcher` y
 * aplica lo que este decide (confirmar, ajustar la visibilidad, copiar a la
 * DLQ). Lo comparten `SqsPoller` y `SqsLambdaHandler`. No borra los
 * confirmados: eso lo hace quien lo invoca.
 *
 * - `Processed`, `Duplicate` e `Ignored`: se confirma.
 * - `RetryLater` e `InProgress`: se ajusta la visibilidad al backoff del
 *   despachador y la entrega queda para otra vuelta. La política de redrive de
 *   la cola la manda a la DLQ cuando supera `maxReceiveCount`.
 * - `DeadLetter`: se copia a la DLQ con el motivo y se confirma. Si la copia
 *   falla, se deja para otra vuelta.
 *
 * En colas FIFO, después de la primera entrega que no se confirma, el resto del
 * lote vuelve a la cola sin despacharse: así no se rompe el orden del grupo.
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

  /** Un `DeliveryReport` por entrega, en el mismo orden. */
  async process(deliveries: readonly SqsDelivery[]): Promise<DeliveryReport[]> {
    const reports: DeliveryReport[] = [];
    let halted = false;
    for (const delivery of deliveries) {
      if (halted) {
        reports.push({
          messageId: delivery.messageId,
          action: DeliveryAction.Redeliver,
        });
        // Visibilidad cero: la entrega vuelve de inmediato para el siguiente intento.
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

  private async handle(delivery: SqsDelivery): Promise<DeliveryReport> {
    let result: DispatchResult;
    try {
      result = await this.dispatcher.dispatch(delivery.body, {
        receiveCount: delivery.receiveCount,
        retryPolicy: this.queue.retryPolicy,
        visibilityTimeoutMs: this.queue.visibilityTimeoutSeconds * 1000,
      });
    } catch (err) {
      // El despachador informa los fallos como resultados: si lanza, es un bug o una caída.
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
      // Sin el cambio, el mensaje vuelve cuando vence su visibilidad actual.
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
