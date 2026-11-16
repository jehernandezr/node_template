import { SqsDeliveryMapper } from '../sqs-delivery-mapper.js';
import type { SqsLambdaRecord } from '../sqs-lambda-event.js';

describe('SqsDeliveryMapper', () => {
  it.each([
    ['3', 3],
    ['1', 1],
    ['0', 1],
    ['-2', 1],
    ['1.5', 1],
    ['abc', 1],
    [undefined, 1],
  ])('reads the receive count %s as %d', (value, expected) => {
    expect(SqsDeliveryMapper.receiveCount(value)).toBe(expected);
  });

  it('maps a Lambda record with its group', () => {
    const record: SqsLambdaRecord = {
      messageId: 'm-1',
      receiptHandle: 'rh-1',
      body: '{"x":1}',
      attributes: {
        ApproximateReceiveCount: '2',
        MessageGroupId: 'acc-1',
      },
    };
    expect(SqsDeliveryMapper.fromRecord(record)).toEqual({
      messageId: 'm-1',
      receiptHandle: 'rh-1',
      body: '{"x":1}',
      receiveCount: 2,
      groupId: 'acc-1',
    });
  });

  it('maps a Lambda record without a group', () => {
    const delivery = SqsDeliveryMapper.fromRecord({
      messageId: 'm-2',
      receiptHandle: 'rh-2',
      body: '',
      attributes: { ApproximateReceiveCount: '1' },
    });
    expect(delivery).not.toHaveProperty('groupId');
  });

  it('maps a received message and skips one without id or receipt', () => {
    expect(
      SqsDeliveryMapper.fromMessage({
        MessageId: 'm-3',
        ReceiptHandle: 'rh-3',
        Body: 'payload',
        Attributes: {
          ApproximateReceiveCount: '4',
          MessageGroupId: 'g-3',
        },
      }),
    ).toEqual({
      messageId: 'm-3',
      receiptHandle: 'rh-3',
      body: 'payload',
      receiveCount: 4,
      groupId: 'g-3',
    });
    expect(SqsDeliveryMapper.fromMessage({ MessageId: 'm-4' })).toBeUndefined();
    expect(
      SqsDeliveryMapper.fromMessage({ ReceiptHandle: 'rh-5' }),
    ).toBeUndefined();
  });

  it('reads a missing body as empty', () => {
    expect(
      SqsDeliveryMapper.fromMessage({
        MessageId: 'm-6',
        ReceiptHandle: 'rh-6',
      }),
    ).toMatchObject({ body: '', receiveCount: 1 });
  });
});
