import { DeliveryAction } from './delivery-action.enum.js';
import { SqsDeliveryMapper } from './sqs-delivery-mapper.js';
import type { SqsDeliveryProcessor } from './sqs-delivery-processor.js';
import type { SqsBatchResponse, SqsLambdaEvent } from './sqs-lambda-event.js';

/** Handler de Lambda para un evento SQS con fallos parciales por lote. */
export class SqsLambdaHandler {
  constructor(private readonly processor: SqsDeliveryProcessor) {}

  /** Responde con `batchItemFailures` para las entregas que deben volver a la cola. */
  async handle(event: SqsLambdaEvent): Promise<SqsBatchResponse> {
    const reports = await this.processor.process(
      event.Records.map((record) => SqsDeliveryMapper.fromRecord(record)),
    );
    return {
      batchItemFailures: reports
        .filter((report) => report.action === DeliveryAction.Redeliver)
        .map((report) => ({ itemIdentifier: report.messageId })),
    };
  }
}
