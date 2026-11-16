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
  description: 'Se actualizó una tarea.',
});
const taskDeleted = defineEvent({
  type: 'tasks.task.deleted.v1',
  payload: TaskPayload,
  description: 'Se borró una tarea.',
});
const tasksTopic = defineTopic({
  name: 'tasks-events',
  events: [taskUpdated, taskDeleted],
  description: 'Eventos de tareas.',
});
const generateReport = defineCommand({
  type: 'reports.report.generate.v1',
  payload: ReportPayload,
  description: 'Genera un reporte.',
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
      description: 'Comandos de reportes.',
    }),
  },
});
const notifications = defineServiceContract({
  service: 'notifications',
  description: 'Notificaciones.',
  queues: {
    tasksEvents: defineQueue({
      name: 'notifications-tasks-events',
      retry: { maxAttempts: 6, baseMs: 2_000, maxMs: 600_000 },
      subscriptions: [{ topic: tasksTopic, events: [taskUpdated] }],
      description: 'Eventos de tareas que notifican.',
    }),
  },
});

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

/** Contratos de ejemplo compartidos por varias pruebas de la exportación. */
export class ContractFixtures {
  /** Los contratos del registro real, en el orden en que se exportan. */
  static registered(): readonly ServiceContract[] {
    return [platformContract, identityContract, billingContract];
  }

  /** Servicio con tópico y comando, sin esquemas propios. */
  static tasks(): ServiceContract {
    return tasks;
  }

  /** Servicio que consume comandos en una cola propia. */
  static reports(): ServiceContract {
    return reports;
  }

  /** Servicio que se suscribe a un tópico de tareas. */
  static notifications(): ServiceContract {
    return notifications;
  }

  /** Servicio que publica un tópico FIFO y envía un comando. */
  static orders(): ServiceContract {
    return orders;
  }

  /** Servicio que publica un tópico y envía dos comandos. */
  static audit(): ServiceContract {
    return audit;
  }

  /** Servicio con dos colas de comandos, una sin remitentes. */
  static payments(): ServiceContract {
    return payments;
  }

  /** Servicio que se suscribe a tópicos de pedidos y auditoría. */
  static reporting(): ServiceContract {
    return reporting;
  }

  /** Ejemplo de mensajería de tareas, con platform. */
  static tasksMessaging(): readonly ServiceContract[] {
    return [platformContract, tasks, reports, notifications];
  }

  /** Ejemplo de mensajería de pedidos, con platform. */
  static ordersMessaging(): readonly ServiceContract[] {
    return [platformContract, orders, audit, payments, reporting];
  }
}
