import { z } from 'zod';
import {
  defineCommand,
  defineEvent,
  defineQueue,
  defineServiceContract,
  defineTopic,
  IdSchema,
  platformContract,
} from '@contracts/platform';
import { ASYNCAPI_PATH } from '../export-constants.js';
import { AsyncApiBuilder } from '../async-api-builder.js';
import { GlobalUniquenessChecker } from '../global-uniqueness-checker.js';
import { SchemaOwnership } from '../schema-ownership.js';
import { TopologyBuilder } from '../topology-builder.js';
import { ContractFixtures } from './utils/contract-fixtures.js';

type Obj = Record<string, unknown>;

const builder = new AsyncApiBuilder(
  new SchemaOwnership(),
  new TopologyBuilder(new GlobalUniquenessChecker()),
);

describe('AsyncApiBuilder', () => {
  describe('build', () => {
    const doc = builder.build(ContractFixtures.tasksMessaging());

    it('documents one channel per topic and queue', () => {
      expect(Object.keys(doc['channels'] as Obj).sort()).toEqual([
        'notifications-tasks-events',
        'reports-commands',
        'tasks-events',
      ]);
      expect(doc['asyncapi']).toBe('3.0.0');
    });

    it('links each message payload to the contract.json of its owner', () => {
      const messages = (doc['components'] as Obj)['messages'] as Obj;

      expect(messages['reports.report.generate.v1']).toMatchObject({
        payload: {
          $ref: 'reports/export/contract.json#/schemas/ReportPayload',
        },
        'x-kind': 'command',
        'x-owner': 'reports',
      });
    });

    it('declares who sends and who receives each queue', () => {
      const operations = doc['operations'] as Obj;

      expect(operations['reports-commands.send']).toMatchObject({
        action: 'send',
        'x-producers': ['tasks'],
      });
      expect(operations['notifications-tasks-events.receive']).toMatchObject({
        action: 'receive',
        'x-consumer': 'notifications',
        messages: [
          {
            $ref: '#/channels/notifications-tasks-events/messages/tasks.task.updated.v1',
          },
        ],
      });
    });
  });

  describe('build (messaging details)', () => {
    const doc = builder.build(ContractFixtures.ordersMessaging());
    const channels = doc['channels'] as Record<string, Obj>;
    const operations = doc['operations'] as Record<string, Obj>;
    const messages = (doc['components'] as Obj)['messages'] as Record<
      string,
      Obj
    >;

    it('marks FIFO topics and queues in the channel description', () => {
      expect(channels['orders-events']?.['description']).toBe(
        'FIFO topic of orders. Order events.',
      );
      expect(channels['audit-events']?.['description']).toBe(
        'Topic of audit. Audit events.',
      );
      expect(channels['reporting-events']?.['description']).toBe(
        'FIFO queue of reporting. Everything that is reported.',
      );
      expect(channels['payments-commands']?.['description']).toBe(
        'Queue of payments. Payment commands.',
      );
    });

    it('delivers every topic event to a queue without a filter', () => {
      expect(
        Object.keys(channels['reporting-events']?.['messages'] as Obj),
      ).toEqual([
        'orders.order.placed.v1',
        'orders.order.shipped.v1',
        'audit.entry.logged.v1',
      ]);
      expect(operations['reporting-events.receive']?.['messages']).toHaveLength(
        3,
      );
    });

    it('publishes each topic as a send operation of its owner', () => {
      expect(operations['orders-events.publish']).toMatchObject({
        action: 'send',
        channel: { $ref: '#/channels/orders-events' },
        'x-producers': ['orders'],
      });
      expect(operations['orders-events.publish']?.['messages']).toHaveLength(2);
    });

    it('lists the sorted, deduplicated senders of the queue commands', () => {
      expect(operations['payments-commands.send']?.['x-producers']).toEqual([
        'audit',
        'orders',
      ]);
    });

    it('keeps the send operation of a queue nobody sends to, with no producers', () => {
      expect(operations['payments-unused.send']?.['x-producers']).toEqual([]);
    });

    it('omits the send operation of a queue that only receives events', () => {
      expect(Object.keys(operations)).not.toContain('reporting-events.send');
      expect(Object.keys(operations)).toContain('reporting-events.receive');
    });

    it('describes each message with its kind, version and owner', () => {
      expect(messages['orders.order.placed.v1']).toMatchObject({
        name: 'orders.order.placed.v1',
        summary: 'An order was placed.',
        contentType: 'application/json',
        payload: { $ref: 'orders/export/contract.json#/schemas/OrderPayload' },
        'x-kind': 'event',
        'x-version': 1,
        'x-owner': 'orders',
      });
      expect(messages['payments.payment.charge.v1']).toMatchObject({
        'x-kind': 'command',
        'x-owner': 'payments',
      });
    });

    it('documents the real registry with a channel per topic and queue', () => {
      const real = builder.build(ContractFixtures.registered());

      expect(ASYNCAPI_PATH).toBe('libs/contracts/asyncapi.json');
      expect(real['channels']).toHaveProperty('identity-events');
    });

    it('fails when an event uses an unregistered payload schema', () => {
      const anonymous = defineEvent({
        type: 'ghost.thing.happened.v1',
        payload: z.object({ id: IdSchema }),
        description: 'No name.',
      });
      const ghost = defineServiceContract({
        service: 'ghost',
        description: 'x',
        events: { anonymous },
        topics: {
          events: defineTopic({
            name: 'ghost-events',
            events: [anonymous],
            description: 'x',
          }),
        },
      });

      expect(() => builder.build([platformContract, ghost])).toThrow(
        /asyncapi \(ghost\): ghost\.thing\.happened\.v1 uses an unnamed schema/,
      );
    });

    it('fails when a command uses an unregistered payload schema', () => {
      const anonymous = defineCommand({
        type: 'ghost.thing.do.v1',
        payload: z.object({ id: IdSchema }),
        description: 'No name.',
      });
      const ghost = defineServiceContract({
        service: 'ghost',
        description: 'x',
        commands: { anonymous },
        queues: {
          commands: defineQueue({
            name: 'ghost-commands',
            commands: [anonymous],
            description: 'x',
          }),
        },
      });

      expect(() => builder.build([platformContract, ghost])).toThrow(
        /uses an unnamed schema/,
      );
    });

    it('propagates topology validation errors', () => {
      expect(() =>
        builder.build([platformContract, ContractFixtures.orders()]),
      ).toThrow(/topology-export: orders sends payments\.payment\.charge\.v1/);
    });

    it('propagates global uniqueness errors', () => {
      const orders = ContractFixtures.orders();

      expect(() =>
        builder.build([
          platformContract,
          orders,
          { ...orders, service: 'copy' },
        ]),
      ).toThrow(/is already declared in orders/);
    });
  });
});
