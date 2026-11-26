import { DeliveryAction } from './delivery-action.enum.js';
import { SqsDeliveryMapper } from './sqs-delivery-mapper.js';
import type { SqsDeliveryProcessor } from './sqs-delivery-processor.js';
import type { SqsBatchResponse, SqsLambdaEvent } from './sqs-lambda-event.js';

/** Lambda handler for an SQS event with partial batch failures. */
export class SqsLambdaHandler {
  constructor(private readonly processor: SqsDeliveryProcessor) {}

  /**
   * Responds with `batchItemFailures` for the deliveries that must go back to the queue.
   * @param event Lambda SQS event.
   * @returns The batch response.
   */
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
