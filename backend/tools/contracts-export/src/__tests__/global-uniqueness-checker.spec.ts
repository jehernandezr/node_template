import { z } from 'zod';
import {
  Access,
  defineCommand,
  defineEvent,
  defineOperation,
  defineQueue,
  defineRoute,
  defineServiceContract,
  defineTopic,
  HttpMethod,
  type ServiceContract,
} from '@contracts/platform';
import { GlobalUniquenessChecker } from '../global-uniqueness-checker.js';

const Item = z.strictObject({ itemId: z.string() });

const route = defineRoute({
  id: 'demo.items.get',
  method: HttpMethod.Get,
  path: '/v1/items/{itemId}',
  request: Item,
  access: Access.public(),
  description: 'Reads an item.',
});

const operation = defineOperation({
  id: 'demo.items.get.v1',
  input: Item,
  output: Item,
  idempotent: true,
  mutating: false,
  description: 'Reads an item.',
});

const created = defineEvent({
  type: 'demo.item.created.v1',
  payload: Item,
  description: 'An item was created.',
});

const generate = defineCommand({
  type: 'demo.report.generate.v1',
  payload: Item,
  description: 'Generates a report.',
});

const topic = defineTopic({
  name: 'demo-events',
  events: [created],
  description: 'Service events.',
});

const queue = defineQueue({
  name: 'demo-commands',
  commands: [generate],
  description: 'Service commands.',
});

const first = defineServiceContract({
  service: 'demo',
  description: 'Demo.',
  routes: { get: route },
  operations: { get: operation },
  events: { created },
  commands: { generate },
  topics: { events: topic },
  queues: { commands: queue },
});

const duplicates: [string, Partial<ServiceContract>][] = [
  [
    'route id',
    { operations: {}, events: {}, commands: {}, topics: {}, queues: {} },
  ],
  [
    'operation id',
    { routes: {}, events: {}, commands: {}, topics: {}, queues: {} },
  ],
  [
    'message type',
    { routes: {}, operations: {}, commands: {}, topics: {}, queues: {} },
  ],
  [
    'topic name',
    { routes: {}, operations: {}, events: {}, commands: {}, queues: {} },
  ],
  [
    'queue name',
    { routes: {}, operations: {}, events: {}, commands: {}, topics: {} },
  ],
];

describe('GlobalUniquenessChecker', () => {
  describe('check', () => {
    it.each(duplicates)(
      'rejects a second service that declares the same %s',
      (_name, overrides) => {
        const second: ServiceContract = {
          ...first,
          service: 'other',
          ...overrides,
        };

        const attempt = () =>
          new GlobalUniquenessChecker().check([first, second]);

        expect(attempt).toThrow(/is already declared in/);
      },
    );

    it('accepts the same contract listed twice for one service', () => {
      const attempt = () => new GlobalUniquenessChecker().check([first, first]);

      expect(attempt).not.toThrow();
    });
  });
});
