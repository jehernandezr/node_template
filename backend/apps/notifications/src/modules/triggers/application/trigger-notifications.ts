import { Injectable } from '@nestjs/common';
import {
  Permission,
  type MembershipChangedPayload,
  type SecurityAlertRaisedPayload,
} from '@contracts/identity';
import type { InvoiceIssuedPayload } from '@contracts/billing';
import { NotificationType, TemplateParameter } from '@contracts/notifications';
import type { UserRef } from '@contracts/platform';
import type { RunCompletedPayload } from '@contracts/reports';
import type { TaskUpdatedPayload } from '@contracts/tasks';
import { DispatchFacade, RecipientDirectory } from '../../dispatch/index.js';
import { NotificationIds } from './notification-ids.js';
import { TenantMembers } from './tenant-members.js';

/**
 * Traduce los eventos de otros servicios en avisos. El id de cada aviso sale del id del mensaje y del
 * destinatario, así una reentrega del mismo evento no avisa dos veces.
 */
@Injectable()
export class TriggerNotifications {
  constructor(
    private readonly dispatch: DispatchFacade,
    private readonly recipients: RecipientDirectory,
    private readonly members: TenantMembers,
  ) {}

  /** Una alerta de seguridad es de la cuenta, no de un tenant: el aviso queda en el tenant de origen del usuario. */
  async securityAlert(
    messageId: string,
    alert: SecurityAlertRaisedPayload,
  ): Promise<void> {
    const recipient = await this.recipients.find(alert.userId);
    if (recipient !== undefined) {
      await this.notifyRef(
        messageId,
        recipient.ref.homeTenantId,
        recipient.ref,
        NotificationType.SecurityAlert,
        alert.type,
      );
    }
  }

  /** Solo avisa al autor cuando otra persona cambió su tarea. */
  async taskUpdated(
    messageId: string,
    task: TaskUpdatedPayload,
  ): Promise<void> {
    if (task.actor.userId === task.createdBy.userId) {
      return;
    }
    await this.notifyRef(
      messageId,
      task.tenantId,
      task.createdBy,
      NotificationType.TaskUpdated,
      task.taskId,
    );
  }

  async invoiceIssued(
    messageId: string,
    invoice: InvoiceIssuedPayload,
  ): Promise<void> {
    for (const member of await this.members.withPermission(
      invoice.tenantId,
      Permission.BillingWrite,
    )) {
      await this.notifyRef(
        messageId,
        invoice.tenantId,
        member,
        NotificationType.InvoiceIssued,
        invoice.number,
      );
    }
  }

  async membershipChanged(
    messageId: string,
    change: MembershipChangedPayload,
  ): Promise<void> {
    await this.notifyUserId(
      messageId,
      change.tenantId,
      change.userId,
      NotificationType.AccountActivity,
      change.kind,
    );
  }

  async reportCompleted(
    messageId: string,
    run: RunCompletedPayload,
  ): Promise<void> {
    await this.notifyRef(
      messageId,
      run.tenantId,
      run.requestedBy,
      NotificationType.AccountActivity,
      run.type,
    );
  }

  private async notifyUserId(
    messageId: string,
    tenantId: string,
    userId: string,
    type: NotificationType,
    reference: string,
  ): Promise<void> {
    const recipient = await this.recipients.find(userId);
    if (recipient !== undefined) {
      await this.notifyRef(messageId, tenantId, recipient.ref, type, reference);
    }
  }

  private async notifyRef(
    messageId: string,
    tenantId: string,
    user: UserRef,
    type: NotificationType,
    reference: string,
  ): Promise<void> {
    await this.dispatch.notify({
      notificationId: NotificationIds.derive(messageId, user.userId),
      user,
      tenantId,
      type,
      parameters: new Map([[TemplateParameter.Reference, reference]]),
    });
  }
}
