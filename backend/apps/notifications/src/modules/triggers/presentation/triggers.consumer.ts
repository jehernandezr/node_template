import { Injectable } from '@nestjs/common';
import {
  InvoiceIssuedEvent,
  type InvoiceIssuedPayload,
} from '@contracts/billing';
import {
  MembershipChangedEvent,
  SecurityAlertRaisedEvent,
  type MembershipChangedPayload,
  type SecurityAlertRaisedPayload,
} from '@contracts/identity';
import {
  RunCompletedEvent,
  type RunCompletedPayload,
} from '@contracts/reports';
import { TaskUpdatedEvent, type TaskUpdatedPayload } from '@contracts/tasks';
import type { MessageEnvelope } from '@platform/messaging';
import { Subscribe } from '@platform/messaging/nest';
import { TriggerNotifications } from '../application/trigger-notifications.js';

/** `notifications-triggers` queue: identity, tasks, billing and reports events that notify someone. */
@Injectable()
export class TriggersConsumer {
  constructor(private readonly triggers: TriggerNotifications) {}

  /**
   * Notifies a security alert.
   * @param data Event payload.
   * @param envelope Event envelope; its id makes the notification idempotent.
   */
  @Subscribe(SecurityAlertRaisedEvent)
  onSecurityAlert(
    data: SecurityAlertRaisedPayload,
    envelope: MessageEnvelope<SecurityAlertRaisedPayload>,
  ): Promise<void> {
    return this.triggers.securityAlert(envelope.id, data);
  }

  /**
   * Notifies a task change.
   * @param data Event payload.
   * @param envelope Event envelope; its id makes the notification idempotent.
   */
  @Subscribe(TaskUpdatedEvent)
  onTaskUpdated(
    data: TaskUpdatedPayload,
    envelope: MessageEnvelope<TaskUpdatedPayload>,
  ): Promise<void> {
    return this.triggers.taskUpdated(envelope.id, data);
  }

  /**
   * Notifies an issued invoice.
   * @param data Event payload.
   * @param envelope Event envelope; its id makes the notification idempotent.
   */
  @Subscribe(InvoiceIssuedEvent)
  onInvoiceIssued(
    data: InvoiceIssuedPayload,
    envelope: MessageEnvelope<InvoiceIssuedPayload>,
  ): Promise<void> {
    return this.triggers.invoiceIssued(envelope.id, data);
  }

  /**
   * Notifies a membership change.
   * @param data Event payload.
   * @param envelope Event envelope; its id makes the notification idempotent.
   */
  @Subscribe(MembershipChangedEvent)
  onMembershipChanged(
    data: MembershipChangedPayload,
    envelope: MessageEnvelope<MembershipChangedPayload>,
  ): Promise<void> {
    return this.triggers.membershipChanged(envelope.id, data);
  }

  /**
   * Notifies a finished report.
   * @param data Event payload.
   * @param envelope Event envelope; its id makes the notification idempotent.
   */
  @Subscribe(RunCompletedEvent)
  onReportCompleted(
    data: RunCompletedPayload,
    envelope: MessageEnvelope<RunCompletedPayload>,
  ): Promise<void> {
    return this.triggers.reportCompleted(envelope.id, data);
  }
}
