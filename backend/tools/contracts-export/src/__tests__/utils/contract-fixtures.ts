import { z } from 'zod';
import {
  defineCommand,
  defineEvent,
  defineQueue,
  defineServiceContract,
  defineTopic,
  IdSchema,
  platformContract,
  type ServiceContract,
} from '@contracts/platform';
import { billingContract } from '@contracts/billing';
import { identityContract } from '@contracts/identity';

const TaskPayload = z.object({ taskId: IdSchema });
const ReportPayload = z.object({ reportId: IdSchema });
const OrderPayload = z.object({ orderId: IdSchema });
const AuditPayload = z.object({ auditId: IdSchema });
const PayPayload = z.object({ paymentId: IdSchema });

const taskUpdated = defineEvent({
  type: 'tasks.task.updated.v1',
  payload: TaskPayload,
  description: 'A task was updated.',
});
const taskDeleted = defineEvent({
  type: 'tasks.task.deleted.v1',
  payload: TaskPayload,
  description: 'A task was deleted.',
});
const tasksTopic = defineTopic({
  name: 'tasks-events',
  events: [taskUpdated, taskDeleted],
  description: 'Task events.',
});
const generateReport = defineCommand({
  type: 'reports.report.generate.v1',
  payload: ReportPayload,
  description: 'Generates a report.',
});

const tasks = defineServiceContract({
  service: 'tasks',
  description: 'Tareas.',
  schemas: { TaskPayload },
  events: { taskUpdated, taskDeleted },
  topics: { events: tasksTopic },
  sends: [generateReport],
});
const reports = defineServiceContract({
  service: 'reports',
  description: 'Reportes.',
  schemas: { ReportPayload },
  commands: { generateReport },
  queues: {
    commands: defineQueue({
      name: 'reports-commands',
      visibilityTimeoutSeconds: 300,
      retry: { maxAttempts: 3, baseMs: 2_000, maxMs: 60_000 },
      commands: [generateReport],
      description: 'Report commands.',
    }),
  },
});
const notifications = defineServiceContract({
  service: 'notifications',
  description: 'Notifications.',
  queues: {
    tasksEvents: defineQueue({
      name: 'notifications-tasks-events',
      retry: { maxAttempts: 6, baseMs: 2_000, maxMs: 600_000 },
      subscriptions: [{ topic: tasksTopic, events: [taskUpdated] }],
      description: 'Task events that notify.',
    }),
  },
});

const orderPlaced = defineEvent({
  type: 'orders.order.placed.v1',
  payload: OrderPayload,
  description: 'An order was placed.',
});
const orderShipped = defineEvent({
  type: 'orders.order.shipped.v1',
  payload: OrderPayload,
  description: 'An order was shipped.',
});
const auditLogged = defineEvent({
  type: 'audit.entry.logged.v1',
  payload: AuditPayload,
  description: 'An audit was recorded.',
});
const charge = defineCommand({
  type: 'payments.payment.charge.v1',
  payload: PayPayload,
  description: 'Charges a payment.',
});
const refund = defineCommand({
  type: 'payments.payment.refund.v1',
  payload: PayPayload,
  description: 'Refunds a payment.',
});
const purge = defineCommand({
  type: 'payments.payment.purge.v1',
  payload: PayPayload,
  description: 'Purges a payment.',
});

const ordersTopic = defineTopic({
  name: 'orders-events',
  fifo: true,
  events: [orderPlaced, orderShipped],
  description: 'Order events.',
});
const auditTopic = defineTopic({
  name: 'audit-events',
  events: [auditLogged],
  description: 'Audit events.',
});

const orders = defineServiceContract({
  service: 'orders',
  description: 'Orders.',
  schemas: { OrderPayload },
  events: { orderPlaced, orderShipped },
  topics: { events: ordersTopic },
  sends: [charge],
});
const audit = defineServiceContract({
  service: 'audit',
  description: 'Audit.',
  schemas: { AuditPayload },
  events: { auditLogged },
  topics: { events: auditTopic },
  sends: [charge, refund],
});
const payments = defineServiceContract({
  service: 'payments',
  description: 'Payments.',
  schemas: { PayPayload },
  commands: { charge, refund, purge },
  queues: {
    commands: defineQueue({
      name: 'payments-commands',
      commands: [charge, refund],
      description: 'Payment commands.',
    }),
    unused: defineQueue({
      name: 'payments-unused',
      commands: [purge],
      description: 'No senders.',
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
      description: 'Everything that is reported.',
    }),
  },
});

/** Sample contracts shared by several export tests. */
export class ContractFixtures {
  /** The contracts of the real registry, in export order. */
  static registered(): readonly ServiceContract[] {
    return [platformContract, identityContract, billingContract];
  }

  /** Service with a topic and a command, without its own schemas. */
  static tasks(): ServiceContract {
    return tasks;
  }

  /** Service that consumes commands on its own queue. */
  static reports(): ServiceContract {
    return reports;
  }

  /** Service that subscribes to a tasks topic. */
  static notifications(): ServiceContract {
    return notifications;
  }

  /** Service that publishes a FIFO topic and sends a command. */
  static orders(): ServiceContract {
    return orders;
  }

  /** Service that publishes a topic and sends two commands. */
  static audit(): ServiceContract {
    return audit;
  }

  /** Service with two command queues, one without senders. */
  static payments(): ServiceContract {
    return payments;
  }

  /** Service that subscribes to orders and audit topics. */
  static reporting(): ServiceContract {
    return reporting;
  }

  /** Tasks messaging example, with platform. */
  static tasksMessaging(): readonly ServiceContract[] {
    return [platformContract, tasks, reports, notifications];
  }

  /** Orders messaging example, with platform. */
  static ordersMessaging(): readonly ServiceContract[] {
    return [platformContract, orders, audit, payments, reporting];
  }
}
