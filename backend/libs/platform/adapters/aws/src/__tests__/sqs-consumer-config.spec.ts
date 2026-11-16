import { MessagingErrorCode } from '@platform/messaging';
import {
  SqsConsumerConfig,
  type SqsConsumerSettings,
} from '../sqs-consumer-config.js';

describe('SqsConsumerConfig', () => {
  it('uses the defaults when nothing is set', () => {
    expect(new SqsConsumerConfig()).toMatchObject({
      batchSize: 10,
      waitTimeSeconds: 20,
      errorDelayMs: 1_000,
    });
  });

  it('keeps the values inside the ranges', () => {
    expect(
      new SqsConsumerConfig({
        batchSize: 1,
        waitTimeSeconds: 0,
        errorDelayMs: 0,
      }),
    ).toMatchObject({ batchSize: 1, waitTimeSeconds: 0, errorDelayMs: 0 });
  });

  it.each<SqsConsumerSettings>([
    { batchSize: 0 },
    { batchSize: 11 },
    { batchSize: 1.5 },
    { waitTimeSeconds: -1 },
    { waitTimeSeconds: 21 },
    { errorDelayMs: -1 },
    { errorDelayMs: 3_600_001 },
  ])('rejects an invalid setting %o', async (settings) => {
    await expect(
      Promise.resolve().then(() => new SqsConsumerConfig(settings)),
    ).rejects.toMatchObject({ code: MessagingErrorCode.InvalidOptions });
  });
});
