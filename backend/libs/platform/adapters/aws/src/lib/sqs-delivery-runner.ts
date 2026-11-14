import {
  ChangeMessageVisibilityCommand,
  DeleteMessageBatchCommand,
  type Message,
  MessageSystemAttributeName,
  ReceiveMessageCommand,
  SendMessageCommand,
  type SQSClient,
} from '@aws-sdk/client-sqs';
import {
  DispatchOutcome,
  type DispatchResult,
  type MessageDispatcher,
  MessagingError,
  MessagingErrorCode,
  type QueueDef,
  type Topology,
} from '@platform/messaging';
import type { LoggerPort } from '@platform/observability';
import { AwsOperation, transportError } from './aws-errors.js';
import type { AwsMessagingNames } from './messaging-names.js';

/** Registro SQS que entrega Lambda (solo los campos que se usan). */
export interface SqsLambdaRecord {
  readonly messageId: string;
  readonly receiptHandle: string;
  readonly body: string;
  readonly attributes: {
    readonly ApproximateReceiveCount: string;
    readonly MessageGroupId?: string;
  };
}

/** Evento SQS de Lambda. */
export interface SqsLambdaEvent {
  readonly Records: readonly SqsLambdaRecord[];
}

/** Respuesta de Lambda con `ReportBatchItemFailures` activado en el event source mapping. */
export interface SqsBatchResponse {
  readonly batchItemFailures: { readonly itemIdentifier: string }[];
}

/** Una entrega, venga de Lambda o de `ReceiveMessage`. */
export interface SqsDelivery {
  readonly messageId: string;
  readonly receiptHandle: string;
  readonly body: string;
  /** Entregas hasta ahora, contando esta (`ApproximateReceiveCount`). */
  readonly receiveCount: number;
  readonly groupId?: string;
}

/** Qué pasa con una entrega después de procesarla. */
export enum DeliveryAction {
  /** Se borra de la cola: procesada, duplicada, ignorada o ya copiada a la DLQ. */
  Acknowledge = 'acknowledge',
  /** Vuelve a la cola cuando vence su visibilidad. */
  Redeliver = 'redeliver',
}

/** Resultado de una entrega. `result` falta si no se despachó (FIFO detenido). */
export interface DeliveryReport {
  readonly messageId: string;
  readonly action: DeliveryAction;
  readonly result?: DispatchResult;
}

/** Conteo de una pasada de {@link SqsDeliveryRunner.pollOnce}. */
export interface PollReport {
  readonly received: number;
  readonly acknowledged: number;
  readonly redelivered: number;
}

/** Atributos que acompañan un mensaje copiado a la DLQ. */
export enum DeadLetterAttribute {
  Error = 'platform-error',
  ErrorCode = 'platform-error-code',
  SourceQueue = 'platform-source-queue',
}

/** Dependencias y ajustes de {@link SqsDeliveryRunner}. */
export interface SqsDeliveryRunnerOptions {
  readonly sqs: SQSClient;
  readonly names: AwsMessagingNames;
  /** Despachador de la cola; su `consumer` es el nombre lógico de la cola. */
  readonly dispatcher: MessageDispatcher;
  readonly topology: Topology;
  /** Nombre lógico de la cola que consume, declarada en la topología. */
  readonly queue: string;
  readonly logger: LoggerPort;
  /** Mensajes por `ReceiveMessage`, de 1 a 10. Por defecto 10. */
  readonly batchSize?: number;
  /** Long polling en segundos, de 0 a 20. Por defecto 20. */
  readonly waitTimeSeconds?: number;
  /** Pausa después de un error del ciclo de polling. Por defecto 1 s. */
  readonly errorDelayMs?: number;
}

/** Visibilidad máxima de SQS (12 h). */
const MAX_VISIBILITY_SECONDS = 43_200;
/** Largo máximo del motivo copiado a la DLQ. */
const MAX_ERROR_ATTRIBUTE_LENGTH = 1_024;
const DEFAULT_BATCH_SIZE = 10;
const DEFAULT_WAIT_TIME_SECONDS = 20;
const DEFAULT_ERROR_DELAY_MS = 1_000;

function checkRange(name: string, value: number, min: number, max: number) {
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new MessagingError(
      MessagingErrorCode.InvalidOptions,
      `${name} must be an integer between ${min} and ${max}`,
    );
  }
}

function receiveCountOf(value: string | undefined): number {
  const count = Number(value);
  return Number.isInteger(count) && count > 0 ? count : 1;
}

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(done, ms);
    function done() {
      clearTimeout(timer);
      signal.removeEventListener('abort', done);
      resolve();
    }
    signal.addEventListener('abort', done, { once: true });
  });
}

/**
 * Consume una cola SQS con el `MessageDispatcher` y aplica lo que este decide:
 *
 * - `Processed`, `Duplicate` e `Ignored`: se confirma (se borra).
 * - `RetryLater` e `InProgress`: `ChangeMessageVisibility` con el backoff del
 *   dispatcher y la entrega queda para otra vuelta (en Lambda, como
 *   `batchItemFailures`). La política de redrive de la cola la manda a la DLQ
 *   cuando supera `maxReceiveCount`.
 * - `DeadLetter` (error permanente, contrato roto, tenant inválido): se copia el
 *   cuerpo a la DLQ con el motivo en atributos y se confirma, sin esperar los
 *   reintentos. Si la copia falla, se deja para otra vuelta.
 *
 * En colas FIFO, después de la primera entrega que no se confirma, el resto del
 * lote vuelve a la cola sin despacharse, para no romper el orden (la regla de
 * AWS para lotes FIFO con fallos parciales).
 *
 * Sirve en Lambda (`handleLambdaEvent`) y en Fargate (`start`/`stop`, long polling).
 */
export class SqsDeliveryRunner {
  private readonly options: SqsDeliveryRunnerOptions;
  private readonly queue: QueueDef;
  private readonly logger: LoggerPort;
  private loop: Promise<void> | undefined;
  private abort: AbortController | undefined;

  constructor(options: SqsDeliveryRunnerOptions) {
    const queue = options.topology.queueFor(options.queue);
    if (!queue) {
      throw new MessagingError(
        MessagingErrorCode.UnknownQueue,
        `queue "${options.queue}" is not declared in the topology`,
      );
    }
    checkRange('batchSize', options.batchSize ?? DEFAULT_BATCH_SIZE, 1, 10);
    checkRange(
      'waitTimeSeconds',
      options.waitTimeSeconds ?? DEFAULT_WAIT_TIME_SECONDS,
      0,
      20,
    );
    this.options = options;
    this.queue = queue;
    this.logger = options.logger.child({ queue: queue.name });
  }

  /** Handler de Lambda para un evento SQS con fallos parciales por lote. */
  async handleLambdaEvent(event: SqsLambdaEvent): Promise<SqsBatchResponse> {
    const reports = await this.process(
      event.Records.map((record) => ({
        messageId: record.messageId,
        receiptHandle: record.receiptHandle,
        body: record.body,
        receiveCount: receiveCountOf(record.attributes.ApproximateReceiveCount),
        ...(record.attributes.MessageGroupId === undefined
          ? {}
          : { groupId: record.attributes.MessageGroupId }),
      })),
    );
    return {
      batchItemFailures: reports
        .filter((report) => report.action === DeliveryAction.Redeliver)
        .map((report) => ({ itemIdentifier: report.messageId })),
    };
  }

  /**
   * Despacha un lote en orden y aplica visibilidad y DLQ. No borra los
   * confirmados: eso lo hace Lambda o {@link pollOnce}.
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

  /** Una vuelta de long polling: recibe, despacha y borra los confirmados. */
  async pollOnce(signal?: AbortSignal): Promise<PollReport> {
    const { names, sqs } = this.options;
    const queueUrl = await names.queueUrl(this.physicalName());
    let messages: Message[];
    try {
      const output = await sqs.send(
        new ReceiveMessageCommand({
          QueueUrl: queueUrl,
          MaxNumberOfMessages: this.options.batchSize ?? DEFAULT_BATCH_SIZE,
          WaitTimeSeconds:
            this.options.waitTimeSeconds ?? DEFAULT_WAIT_TIME_SECONDS,
          MessageSystemAttributeNames: [
            MessageSystemAttributeName.ApproximateReceiveCount,
            MessageSystemAttributeName.MessageGroupId,
          ],
        }),
        signal === undefined ? {} : { abortSignal: signal },
      );
      messages = output.Messages ?? [];
    } catch (err) {
      throw transportError(AwsOperation.ReceiveMessage, err, this.queue.name);
    }

    const deliveries: SqsDelivery[] = [];
    for (const message of messages) {
      if (!message.MessageId || !message.ReceiptHandle) continue;
      const groupId = message.Attributes?.MessageGroupId;
      deliveries.push({
        messageId: message.MessageId,
        receiptHandle: message.ReceiptHandle,
        body: message.Body ?? '',
        receiveCount: receiveCountOf(
          message.Attributes?.ApproximateReceiveCount,
        ),
        ...(groupId === undefined ? {} : { groupId }),
      });
    }
    const reports = await this.process(deliveries);
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

  /** Arranca el ciclo de long polling (Fargate). Llamar `stop` al apagar. */
  start(): void {
    if (this.loop) return;
    const abort = new AbortController();
    this.abort = abort;
    const errorDelay = this.options.errorDelayMs ?? DEFAULT_ERROR_DELAY_MS;
    this.loop = (async () => {
      while (!abort.signal.aborted) {
        try {
          await this.pollOnce(abort.signal);
        } catch (err) {
          if (abort.signal.aborted) break;
          this.logger.error('sqs polling failed', {
            error_code: (err as { code?: unknown }).code,
          });
          await sleep(errorDelay, abort.signal);
        }
      }
    })();
  }

  /** Detiene el ciclo: corta la espera del long polling y deja terminar el lote en curso. */
  async stop(): Promise<void> {
    this.abort?.abort();
    await this.loop;
    this.loop = undefined;
    this.abort = undefined;
  }

  private async handle(delivery: SqsDelivery): Promise<DeliveryReport> {
    let result: DispatchResult;
    try {
      result = await this.options.dispatcher.dispatch(delivery.body, {
        receiveCount: delivery.receiveCount,
        retryPolicy: this.queue.retryPolicy,
        visibilityTimeoutMs: this.queue.visibilityTimeoutSeconds * 1000,
      });
    } catch (err) {
      // The dispatcher reports failures as results; this is a bug or a crash.
      this.logger.error('dispatcher threw', {
        message_id: delivery.messageId,
        error_code: (err as { code?: unknown }).code,
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
        const copied = await this.sendToDeadLetter(delivery, result);
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
      MAX_VISIBILITY_SECONDS,
      Math.max(0, Math.ceil(delayMs / 1000)),
    );
    try {
      const queueUrl = await this.options.names.queueUrl(this.physicalName());
      await this.options.sqs.send(
        new ChangeMessageVisibilityCommand({
          QueueUrl: queueUrl,
          ReceiptHandle: delivery.receiptHandle,
          VisibilityTimeout: seconds,
        }),
      );
    } catch (err) {
      // The message comes back when its current visibility timeout ends.
      const error = transportError(
        AwsOperation.ChangeMessageVisibility,
        err,
        this.queue.name,
      );
      this.logger.warn('could not change message visibility', {
        message_id: delivery.messageId,
        error_code: error.code,
      });
    }
  }

  private async sendToDeadLetter(
    delivery: SqsDelivery,
    result: Extract<DispatchResult, { outcome: DispatchOutcome.DeadLetter }>,
  ): Promise<boolean> {
    const { names, sqs } = this.options;
    const fifo = this.queue.isFifo;
    const attributes = {
      [DeadLetterAttribute.Error]: {
        DataType: 'String',
        StringValue: result.error.slice(0, MAX_ERROR_ATTRIBUTE_LENGTH) || '-',
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
    try {
      const queueUrl = await names.queueUrl(
        names.deadLetterQueueName(this.queue.name, fifo),
      );
      await sqs.send(
        new SendMessageCommand({
          QueueUrl: queueUrl,
          MessageBody: delivery.body,
          MessageAttributes: attributes,
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
      const error = transportError(
        AwsOperation.SendMessage,
        err,
        this.queue.name,
      );
      this.logger.error('could not copy the message to the dead-letter queue', {
        message_id: delivery.messageId,
        error_code: error.code,
      });
      return false;
    }
  }

  private async delete(
    queueUrl: string,
    deliveries: readonly SqsDelivery[],
  ): Promise<void> {
    for (let start = 0; start < deliveries.length; start += 10) {
      const chunk = deliveries.slice(start, start + 10);
      try {
        const output = await this.options.sqs.send(
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
          });
        }
      } catch (err) {
        // Redelivered messages are absorbed by the processed-message claim.
        const error = transportError(
          AwsOperation.DeleteMessageBatch,
          err,
          this.queue.name,
        );
        this.logger.warn('could not delete processed messages', {
          error_code: error.code,
        });
      }
    }
  }

  private physicalName(): string {
    return this.options.names.queueName(this.queue.name, this.queue.isFifo);
  }
}
