import type { Message } from '@aws-sdk/client-sqs';
import type { SqsDelivery } from './sqs-delivery.js';
import type { SqsLambdaRecord } from './sqs-lambda-event.js';

/** Convierte lo que entrega SQS (Lambda o `ReceiveMessage`) en un {@link SqsDelivery}. */
export class SqsDeliveryMapper {
  /** Un conteo ausente o inválido cuenta como la primera entrega. */
  static receiveCount(value: string | undefined): number {
    const count = Number(value);
    return Number.isInteger(count) && count > 0 ? count : 1;
  }

  static fromRecord(record: SqsLambdaRecord): SqsDelivery {
    return {
      messageId: record.messageId,
      receiptHandle: record.receiptHandle,
      body: record.body,
      receiveCount: SqsDeliveryMapper.receiveCount(
        record.attributes.ApproximateReceiveCount,
      ),
      ...(record.attributes.MessageGroupId === undefined
        ? {}
        : { groupId: record.attributes.MessageGroupId }),
    };
  }

  /** `undefined` cuando al mensaje le falta el id o el recibo: no se puede confirmar. */
  static fromMessage(message: Message): SqsDelivery | undefined {
    if (!message.MessageId || !message.ReceiptHandle) {
      return undefined;
    }
    const groupId = message.Attributes?.['MessageGroupId'];
    return {
      messageId: message.MessageId,
      receiptHandle: message.ReceiptHandle,
      body: message.Body ?? '',
      receiveCount: SqsDeliveryMapper.receiveCount(
        message.Attributes?.['ApproximateReceiveCount'],
      ),
      ...(groupId === undefined ? {} : { groupId }),
    };
  }
}
