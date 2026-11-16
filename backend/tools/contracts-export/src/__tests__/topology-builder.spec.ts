import {
  defineCommandReference,
  defineQueue,
  defineServiceContract,
  defineTopicReference,
  platformContract,
  type ServiceContract,
} from '@contracts/platform';
import { GlobalUniquenessChecker } from '../global-uniqueness-checker.js';
import { TopologyBuilder } from '../topology-builder.js';
import { ContractFixtures } from './utils/contract-fixtures.js';

type Obj = Record<string, unknown>;

const builder = new TopologyBuilder(new GlobalUniquenessChecker());

describe('TopologyBuilder', () => {
  describe('build', () => {
    it('derives topics, queues, routes, producers and consumers from the contracts', () => {
      const topology = builder.build(ContractFixtures.tasksMessaging());

      expect(topology).toMatchObject({
        formatVersion: 1,
        topics: [
          {
            name: 'tasks-events',
            fifo: false,
            owner: 'tasks',
            producers: ['tasks'],
          },
        ],
        queues: [
          {
            name: 'notifications-tasks-events',
            maxAttempts: 6,
            dlq: {
              name: 'notifications-tasks-events-dlq',
              maxReceiveCount: 6,
              retentionSeconds: 1_209_600,
            },
            subscriptions: [
              { topic: 'tasks-events', filterTypes: ['tasks.task.updated.v1'] },
            ],
            consumer: 'notifications',
            producers: [],
          },
          {
            name: 'reports-commands',
            visibilityTimeoutSeconds: 300,
            retry: { maxAttempts: 3, baseMs: 2_000, maxMs: 60_000 },
            subscriptions: [],
            consumer: 'reports',
            producers: ['tasks'],
          },
        ],
        routes: [
          {
            type: 'reports.report.generate.v1',
            kind: 'command',
            target: 'reports-commands',
            targetKind: 'queue',
            owner: 'reports',
          },
          {
            type: 'tasks.task.deleted.v1',
            kind: 'event',
            target: 'tasks-events',
            targetKind: 'topic',
            owner: 'tasks',
          },
          {
            type: 'tasks.task.updated.v1',
            kind: 'event',
            target: 'tasks-events',
            targetKind: 'topic',
            owner: 'tasks',
          },
        ],
      });
    });

    it('routes the identity events to the identity topic', () => {
      const topology = builder.build(ContractFixtures.registered());

      expect(topology['topics']).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'identity-events',
            owner: 'identity',
          }),
        ]),
      );
      expect((topology['routes'] as Obj[]).map((r) => r['type'])).toEqual(
        expect.arrayContaining([
          'identity.session.revoked.v1',
          'identity.tokens.revoked.v1',
        ]),
      );
    });

    it('fails when a service sends a command nobody declares', () => {
      expect(() =>
        builder.build([platformContract, ContractFixtures.tasks()]),
      ).toThrow(/ningún contrato declara/);
    });

    it('fails when a queue subscribes to an undeclared topic', () => {
      expect(() =>
        builder.build([
          platformContract,
          ContractFixtures.reports(),
          ContractFixtures.notifications(),
        ]),
      ).toThrow(/se suscribe a tasks-events/);
    });

    it('handles contracts with no messaging at all', () => {
      expect(builder.build([platformContract])).toMatchObject({
        topics: [],
        queues: [],
        routes: [],
      });
    });
  });

  describe('build (messaging details)', () => {
    const topology = builder.build(ContractFixtures.ordersMessaging());
    const queues = topology['queues'] as Obj[];

    it('carries the fifo flag and sorts subscriptions by topic', () => {
      const reportingQueue = queues.find(
        (q) => q['name'] === 'reporting-events',
      );

      expect(reportingQueue).toMatchObject({
        fifo: true,
        consumer: 'reporting',
        subscriptions: [
          { topic: 'audit-events', filterTypes: ['audit.entry.logged.v1'] },
          { topic: 'orders-events', filterTypes: [] },
        ],
      });
      expect(
        (topology['topics'] as Obj[]).map((t) => [t['name'], t['fifo']]),
      ).toEqual([
        ['audit-events', false],
        ['orders-events', true],
      ]);
    });

    it('merges the senders of a command into the queue producers', () => {
      expect(
        queues.find((q) => q['name'] === 'payments-commands'),
      ).toMatchObject({ producers: ['audit', 'orders'] });
    });

    it('sorts routes by type and keeps the default retry and dead letter', () => {
      const types = (topology['routes'] as Obj[]).map((r) => r['type']);

      expect(types).toEqual([...types].sort());
      expect(
        queues.find((q) => q['name'] === 'payments-commands'),
      ).toMatchObject({
        maxAttempts: 5,
        visibilityTimeoutSeconds: 30,
        dlq: {
          name: 'payments-commands-dlq',
          maxReceiveCount: 5,
          retentionSeconds: 1_209_600,
        },
      });
    });

    it('fails when two services declare the same topic or message', () => {
      const orders = ContractFixtures.orders();

      expect(() =>
        builder.build([
          platformContract,
          orders,
          { ...orders, service: 'copy' },
        ]),
      ).toThrow(/ya está declarado en orders/);
    });
  });

  describe('build (references by name)', () => {
    const ledger = (events: readonly string[], sends = true): ServiceContract =>
      defineServiceContract({
        service: 'ledger',
        description: 'Libro.',
        queues: {
          orders: defineQueue({
            name: 'ledger-orders',
            fifo: true,
            subscriptions: [
              {
                topic: defineTopicReference({
                  name: 'orders-events',
                  fifo: true,
                  events,
                  description: 'Pedidos.',
                }),
              },
            ],
            description: 'Pedidos que se asientan.',
          }),
        },
        sends: sends
          ? [
              defineCommandReference({
                type: 'payments.payment.charge.v1',
                description: 'Cobro.',
              }),
            ]
          : [],
      });

    const owners = [
      platformContract,
      ContractFixtures.orders(),
      ContractFixtures.payments(),
    ];

    it('resolves the topic and the sent command against their owners', () => {
      const topology = builder.build([
        ...owners,
        ledger(['orders.order.placed.v1']),
      ]);
      const queues = topology['queues'] as Obj[];

      expect(queues.find((q) => q['name'] === 'ledger-orders')).toMatchObject({
        consumer: 'ledger',
        subscriptions: [{ topic: 'orders-events', filterTypes: [] }],
      });
      expect(
        queues.find((q) => q['name'] === 'payments-commands'),
      ).toMatchObject({ producers: ['ledger', 'orders'] });
    });

    it('fails when the reference names an event the owner does not publish', () => {
      expect(() =>
        builder.build([...owners, ledger(['orders.order.cancelled.v1'])]),
      ).toThrow(/espera orders.order.cancelled.v1 en orders-events/);
    });
  });
});
