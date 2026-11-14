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
import { ASYNCAPI_PATH, buildAsyncApi } from './build-asyncapi.js';
import { buildTopology } from './build-topology.js';
import { contracts } from './registry.js';

type Obj = Record<string, unknown>;

const OrderPayload = z.object({ orderId: IdSchema });
const AuditPayload = z.object({ auditId: IdSchema });
const PayPayload = z.object({ paymentId: IdSchema });

const orderPlaced = defineEvent({
  type: 'orders.order.placed.v1',
  payload: OrderPayload,
  description: 'Se hizo un pedido.',
});
const orderShipped = defineEvent({
  type: 'orders.order.shipped.v1',
  payload: OrderPayload,
  description: 'Se envió un pedido.',
});
const auditLogged = defineEvent({
  type: 'audit.entry.logged.v1',
  payload: AuditPayload,
  description: 'Se registró una auditoría.',
});
const charge = defineCommand({
  type: 'payments.payment.charge.v1',
  payload: PayPayload,
  description: 'Cobra un pago.',
});
const refund = defineCommand({
  type: 'payments.payment.refund.v1',
  payload: PayPayload,
  description: 'Reembolsa un pago.',
});

const purge = defineCommand({
  type: 'payments.payment.purge.v1',
  payload: PayPayload,
  description: 'Purga un pago.',
});

const ordersTopic = defineTopic({
  name: 'orders-events',
  fifo: true,
  events: [orderPlaced, orderShipped],
  description: 'Eventos de pedidos.',
});
const auditTopic = defineTopic({
  name: 'audit-events',
  events: [auditLogged],
  description: 'Eventos de auditoría.',
});

const orders = defineServiceContract({
  service: 'orders',
  description: 'Pedidos.',
  schemas: { OrderPayload },
  events: { orderPlaced, orderShipped },
  topics: { events: ordersTopic },
  sends: [charge],
});
const audit = defineServiceContract({
  service: 'audit',
  description: 'Auditoría.',
  schemas: { AuditPayload },
  events: { auditLogged },
  topics: { events: auditTopic },
  sends: [charge, refund],
});
const payments = defineServiceContract({
  service: 'payments',
  description: 'Pagos.',
  schemas: { PayPayload },
  commands: { charge, refund, purge },
  queues: {
    commands: defineQueue({
      name: 'payments-commands',
      commands: [charge, refund],
      description: 'Comandos de pagos.',
    }),
    unused: defineQueue({
      name: 'payments-unused',
      commands: [purge],
      description: 'Sin remitentes.',
    }),
  },
});
const reporting = defineServiceContract({
  service: 'reporting',
  description: 'Reportes.',
  queues: {
    everything: defineQueue({
      name: 'reporting-events',
      fifo: true,
      subscriptions: [
        { topic: ordersTopic },
        { topic: auditTopic, events: [auditLogged] },
      ],
      description: 'Todo lo que se reporta.',
    }),
  },
});
const sample = [platformContract, orders, audit, payments, reporting];

describe('buildAsyncApi (messaging details)', () => {
  const doc = buildAsyncApi(sample);
  const channels = doc['channels'] as Record<string, Obj>;
  const operations = doc['operations'] as Record<string, Obj>;
  const messages = (doc['components'] as Obj)['messages'] as Record<
    string,
    Obj
  >;

  it('marks FIFO topics and queues in the channel description', () => {
    expect(channels['orders-events']['description']).toBe(
      'Tópico FIFO de orders. Eventos de pedidos.',
    );
    expect(channels['audit-events']['description']).toBe(
      'Tópico de audit. Eventos de auditoría.',
    );
    expect(channels['reporting-events']['description']).toBe(
      'Cola FIFO de reporting. Todo lo que se reporta.',
    );
    expect(channels['payments-commands']['description']).toBe(
      'Cola de payments. Comandos de pagos.',
    );
  });

  it('delivers every topic event to a queue without a filter', () => {
    expect(
      Object.keys(channels['reporting-events']['messages'] as Obj),
    ).toEqual([
      'orders.order.placed.v1',
      'orders.order.shipped.v1',
      'audit.entry.logged.v1',
    ]);
    expect(operations['reporting-events.receive']['messages']).toHaveLength(3);
  });

  it('publishes each topic as a send operation of its owner', () => {
    expect(operations['orders-events.publish']).toMatchObject({
      action: 'send',
      channel: { $ref: '#/channels/orders-events' },
      'x-producers': ['orders'],
    });
    expect(operations['orders-events.publish']['messages']).toHaveLength(2);
  });

  it('lists the sorted, deduplicated senders of the queue commands', () => {
    expect(operations['payments-commands.send']['x-producers']).toEqual([
      'audit',
      'orders',
    ]);
  });

  it('keeps the send operation of a queue nobody sends to, with no producers', () => {
    expect(operations['payments-unused.send']['x-producers']).toEqual([]);
  });

  it('omits the send operation of a queue that only receives events', () => {
    expect(Object.keys(operations)).not.toContain('reporting-events.send');
    expect(Object.keys(operations)).toContain('reporting-events.receive');
  });

  it('describes each message with its kind, version and owner', () => {
    expect(messages['orders.order.placed.v1']).toMatchObject({
      name: 'orders.order.placed.v1',
      summary: 'Se hizo un pedido.',
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
    const real = buildAsyncApi(contracts);
    expect(ASYNCAPI_PATH).toBe('libs/contracts/asyncapi.json');
    expect(real['channels']).toHaveProperty('identity-events');
  });

  it('fails when an event uses an unregistered payload schema', () => {
    const anonymous = defineEvent({
      type: 'ghost.thing.happened.v1',
      payload: z.object({ id: IdSchema }),
      description: 'Sin nombre.',
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
    expect(() => buildAsyncApi([platformContract, ghost])).toThrow(
      /asyncapi \(ghost\): ghost\.thing\.happened\.v1 usa un esquema sin nombre/,
    );
  });

  it('fails when a command uses an unregistered payload schema', () => {
    const anonymous = defineCommand({
      type: 'ghost.thing.do.v1',
      payload: z.object({ id: IdSchema }),
      description: 'Sin nombre.',
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
    expect(() => buildAsyncApi([platformContract, ghost])).toThrow(
      /usa un esquema sin nombre/,
    );
  });

  it('propagates topology validation errors', () => {
    expect(() => buildAsyncApi([platformContract, orders])).toThrow(
      /topology-export: orders envía payments\.payment\.charge\.v1/,
    );
  });

  it('propagates global uniqueness errors', () => {
    expect(() =>
      buildAsyncApi([platformContract, orders, { ...orders, service: 'copy' }]),
    ).toThrow(/ya está declarado en orders/);
  });
});

describe('buildTopology (messaging details)', () => {
  const topology = buildTopology(sample);
  const queues = topology['queues'] as Obj[];

  it('carries the fifo flag and sorts subscriptions by topic', () => {
    const reportingQueue = queues.find((q) => q['name'] === 'reporting-events');
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
    expect(queues.find((q) => q['name'] === 'payments-commands')).toMatchObject(
      { producers: ['audit', 'orders'] },
    );
  });

  it('sorts routes by type and keeps the default retry and dead letter', () => {
    const types = (topology['routes'] as Obj[]).map((r) => r['type']);
    expect(types).toEqual([...types].sort());
    expect(queues.find((q) => q['name'] === 'payments-commands')).toMatchObject(
      {
        maxAttempts: 5,
        visibilityTimeoutSeconds: 30,
        dlq: {
          name: 'payments-commands-dlq',
          maxReceiveCount: 5,
          retentionSeconds: 1_209_600,
        },
      },
    );
  });

  it('fails when two services declare the same topic or message', () => {
    expect(() =>
      buildTopology([platformContract, orders, { ...orders, service: 'copy' }]),
    ).toThrow(/ya está declarado en orders/);
  });

  it('handles contracts with no messaging at all', () => {
    expect(buildTopology([platformContract])).toMatchObject({
      topics: [],
      queues: [],
      routes: [],
    });
  });
});
