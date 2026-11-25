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

  @Subscribe(SecurityAlertRaisedEvent)
  onSecurityAlert(
    data: SecurityAlertRaisedPayload,
    envelope: MessageEnvelope<SecurityAlertRaisedPayload>,
  ): Promise<void> {
    return this.triggers.securityAlert(envelope.id, data);
  }

  @Subscribe(TaskUpdatedEvent)
  onTaskUpdated(
    data: TaskUpdatedPayload,
    envelope: MessageEnvelope<TaskUpdatedPayload>,
  ): Promise<void> {
    return this.triggers.taskUpdated(envelope.id, data);
  }

  @Subscribe(InvoiceIssuedEvent)
  onInvoiceIssued(
    data: InvoiceIssuedPayload,
    envelope: MessageEnvelope<InvoiceIssuedPayload>,
  ): Promise<void> {
    return this.triggers.invoiceIssued(envelope.id, data);
  }

  @Subscribe(MembershipChangedEvent)
  onMembershipChanged(
    data: MembershipChangedPayload,
    envelope: MessageEnvelope<MembershipChangedPayload>,
  ): Promise<void> {
    return this.triggers.membershipChanged(envelope.id, data);
  }

  @Subscribe(RunCompletedEvent)
  onReportCompleted(
    data: RunCompletedPayload,
    envelope: MessageEnvelope<RunCompletedPayload>,
  ): Promise<void> {
    return this.triggers.reportCompleted(envelope.id, data);
  }
}
