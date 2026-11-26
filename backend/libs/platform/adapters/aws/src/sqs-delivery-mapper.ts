import type { Message } from '@aws-sdk/client-sqs';
import type { SqsDelivery } from './sqs-delivery.js';
import type { SqsLambdaRecord } from './sqs-lambda-event.js';

/** Converts what SQS delivers (Lambda or `ReceiveMessage`) into a {@link SqsDelivery}. */
export class SqsDeliveryMapper {
  /**
   * A missing or invalid count counts as the first delivery.
   * @param value Attribute value.
   * @returns The count.
   */
  static receiveCount(value: string | undefined): number {
    const count = Number(value);
    return Number.isInteger(count) && count > 0 ? count : 1;
  }

  /**
   * Maps a Lambda SQS record to a delivery.
   * @param record Lambda record.
   * @returns The delivery.
   */
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

  /**
   * `undefined` when the message lacks the id or the receipt: it cannot be acknowledged.
   * @param message SQS message.
   * @returns The delivery, or `undefined`.
   */
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
