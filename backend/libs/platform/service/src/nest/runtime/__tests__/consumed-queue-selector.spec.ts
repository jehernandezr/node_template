import { defineQueue, defineTopic } from '@contracts/platform';
import { InvalidServiceDefinitionError } from '../../../errors/invalid-service-definition.error.js';
import { ConsumedQueueSelector } from '../consumed-queue-selector.js';
import { RuntimeProbeRecorded } from './utils/index.js';

describe('ConsumedQueueSelector', () => {
  const topic = defineTopic({
    name: 'selector-probe-events',
    events: [RuntimeProbeRecorded],
    description: 'Events the selector probe consumes.',
  });
  const usage = defineQueue({
    name: 'billing-usage',
    subscriptions: [{ topic }],
    description: 'Usage queue.',
  });
  const identity = defineQueue({
    name: 'billing-identity',
    fifo: true,
    subscriptions: [{ topic }],
    description: 'Identity queue.',
  });
  const queues = { usage, identity };
  const accountUrl = 'https://sqs.us-east-1.amazonaws.com/123456789012';
  const selector = new ConsumedQueueSelector();

  describe('select', () => {
    it.each([
      ['QUEUE_URL is not set', {}],
      ['QUEUE_URL is blank', { QUEUE_URL: ' ' }],
    ])('returns every queue of the contract when %s', (_, env) => {
      expect(selector.select('billing', queues, env)).toEqual([
        usage,
        identity,
      ]);
    });

    it.each([
      ['a standard queue', `${accountUrl}/dev-billing-usage`, usage],
      ['a FIFO queue', `${accountUrl}/dev-billing-identity.fifo`, identity],
    ])('returns only the queue of QUEUE_URL for %s', (_, url, expected) => {
      expect(
        selector.select('billing', queues, {
          QUEUE_URL: url,
          MESSAGING_NAME_PREFIX: 'dev',
        }),
      ).toEqual([expected]);
    });

    it.each([
      [
        'QUEUE_URL names a queue outside the contract',
        {
          QUEUE_URL: `${accountUrl}/dev-tasks-events`,
          MESSAGING_NAME_PREFIX: 'dev',
        },
      ],
      [
        'QUEUE_URL has another prefix',
        {
          QUEUE_URL: `${accountUrl}/prod-billing-usage`,
          MESSAGING_NAME_PREFIX: 'dev',
        },
      ],
      [
        'MESSAGING_NAME_PREFIX is missing',
        { QUEUE_URL: `${accountUrl}/dev-billing-usage` },
      ],
      [
        'QUEUE_URL is not a URL',
        { QUEUE_URL: 'dev-billing-usage', MESSAGING_NAME_PREFIX: 'dev' },
      ],
    ])('fails when %s', (_, env) => {
      expect(() => selector.select('billing', queues, env)).toThrow(
        InvalidServiceDefinitionError,
      );
    });
  });
});
