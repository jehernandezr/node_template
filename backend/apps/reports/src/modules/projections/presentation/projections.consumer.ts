import { Injectable } from '@nestjs/common';
import {
  InvoiceFailedEvent,
  InvoiceIssuedEvent,
  InvoicePaidEvent,
  type InvoiceFailedPayload,
  type InvoiceIssuedPayload,
  type InvoicePaidPayload,
} from '@contracts/billing';
import {
  NotificationCreatedEvent,
  type NotificationCreatedPayload,
} from '@contracts/notifications';
import {
  TaskCreatedEvent,
  TaskDeletedEvent,
  TaskUpdatedEvent,
  type TaskCreatedPayload,
  type TaskDeletedPayload,
  type TaskUpdatedPayload,
} from '@contracts/tasks';
import { Subscribe } from '@platform/messaging/nest';
import { ProjectFinanceEvents } from '../application/project-finance-events.use-case.js';
import { ProjectTaskEvents } from '../application/project-task-events.use-case.js';

/** Queues `reports-projections` (tasks) and `reports-finance-projections` (invoices and notifications). */
@Injectable()
export class ProjectionsConsumer {
  constructor(
    private readonly tasks: ProjectTaskEvents,
    private readonly finance: ProjectFinanceEvents,
  ) {}

  @Subscribe(TaskCreatedEvent)
  onTaskCreated(data: TaskCreatedPayload): Promise<void> {
    return this.tasks.created(data);
  }

  @Subscribe(TaskUpdatedEvent)
  onTaskUpdated(data: TaskUpdatedPayload): Promise<void> {
    return this.tasks.updated(data);
  }

  @Subscribe(TaskDeletedEvent)
  onTaskDeleted(data: TaskDeletedPayload): Promise<void> {
    return this.tasks.deleted(data);
  }

  @Subscribe(InvoiceIssuedEvent)
  onInvoiceIssued(data: InvoiceIssuedPayload): Promise<void> {
    return this.finance.invoiceIssued(data);
  }

  @Subscribe(InvoicePaidEvent)
  onInvoicePaid(data: InvoicePaidPayload): Promise<void> {
    return this.finance.invoicePaid(data);
  }

  @Subscribe(InvoiceFailedEvent)
  onInvoiceFailed(data: InvoiceFailedPayload): Promise<void> {
    return this.finance.invoiceFailed(data);
  }

  @Subscribe(NotificationCreatedEvent)
  onNotificationCreated(data: NotificationCreatedPayload): Promise<void> {
    return this.finance.notificationCreated(data);
  }
}
