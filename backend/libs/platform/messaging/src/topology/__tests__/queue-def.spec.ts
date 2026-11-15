import { BackoffStrategy, RetryPolicy } from '@platform/primitives';
import { MessagingErrorCode } from '../../errors/messaging-error-code.enum.js';
import { DEFAULT_RETRY_POLICY, QueueDef } from '../queue-def.js';
import { TopicDef } from '../topic-def.js';

describe('QueueDef', () => {
  describe('when it is declared', () => {
    it('has the default visibility timeout, retry policy and retention', () => {
      const queue = new QueueDef('notifications').deadLetter({
        maxReceiveCount: 5,
      });

      expect(queue.visibilityTimeoutSeconds).toBe(30);
      expect(queue.retryPolicy).toBe(DEFAULT_RETRY_POLICY);
      expect(queue.deadLetterConfig).toEqual({
        maxReceiveCount: 5,
        retentionDays: 14,
      });
      expect(queue.isFifo).toBe(false);
    });

    it('names its dead-letter queue after itself', () => {
      expect(new QueueDef('notifications').dlqName).toBe('notifications-dlq');
    });

    it('has no dead-letter configuration until one is declared', () => {
      expect(new QueueDef('notifications').deadLetterConfig).toBeNull();
    });
  });

  describe('when it is configured', () => {
    it('keeps the explicit retry policy', () => {
      const policy = new RetryPolicy(3, 500, 10_000, BackoffStrategy.None);

      expect(new QueueDef('audit').retry(policy).retryPolicy).toBe(policy);
    });

    it('marks the queue as FIFO and keeps the visibility timeout it was given', () => {
      const queue = new QueueDef('ledger').fifo().visibilityTimeout(60);

      expect(queue.isFifo).toBe(true);
      expect(queue.visibilityTimeoutSeconds).toBe(60);
    });

    it('records one subscription per topic, delivering every type when none is filtered', () => {
      const topic = new TopicDef('tasks-events');
      const queue = new QueueDef('audit').subscribesTo(topic);

      expect(queue.subscriptions).toEqual([{ topic, filterTypes: [] }]);
    });

    it('records the filtered message types of a subscription', () => {
      const topic = new TopicDef('tasks-events');
      const queue = new QueueDef('notifications').subscribesTo(topic, {
        types: ['tasks.task.updated.v1'],
      });

      expect(queue.subscriptions).toEqual([
        { topic, filterTypes: ['tasks.task.updated.v1'] },
      ]);
    });

    it('keeps the retention the dead-letter queue was given', () => {
      const queue = new QueueDef('reports').deadLetter({
        maxReceiveCount: 5,
        retentionDays: 7,
      });

      expect(queue.deadLetterConfig).toEqual({
        maxReceiveCount: 5,
        retentionDays: 7,
      });
    });
  });

  describe('when it rejects an invalid setting', () => {
    it.each([
      ['a zero maxReceiveCount', 0],
      ['a fractional maxReceiveCount', 1.5],
    ])('rejects %s with InvalidTopology', (_label, maxReceiveCount) => {
      expect(() =>
        new QueueDef('audit').deadLetter({ maxReceiveCount }),
      ).toThrow(
        expect.objectContaining({ code: MessagingErrorCode.InvalidTopology }),
      );
    });

    it.each([
      ['a zero visibility timeout', 0],
      ['an infinite visibility timeout', Number.POSITIVE_INFINITY],
    ])('rejects %s with InvalidTopology', (_label, seconds) => {
      expect(() => new QueueDef('audit').visibilityTimeout(seconds)).toThrow(
        expect.objectContaining({ code: MessagingErrorCode.InvalidTopology }),
      );
    });
  });
});
