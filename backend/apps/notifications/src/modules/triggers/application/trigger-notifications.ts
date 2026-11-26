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
 * Translates events from other services into notices. Each notice id comes from the message id and the
 * recipient, so a redelivery of the same event does not notify twice.
 */
@Injectable()
export class TriggerNotifications {
  constructor(
    private readonly dispatch: DispatchFacade,
    private readonly recipients: RecipientDirectory,
    private readonly members: TenantMembers,
  ) {}

  /**
   * Notifies the user of a security alert of its account.
   * A security alert belongs to the account, not a tenant: the notice stays in the user's home tenant.
   * @param messageId Id of the event.
   * @param alert Alert payload.
   */
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

  /**
   * Notifies the author of a task that another person changed it.
   * Only notifies the author when another person changed their task.
   * @param messageId Id of the event.
   * @param task Change payload.
   */
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

  /**
   * Notifies the billing managers of the tenant that an invoice was issued.
   * @param messageId Id of the event.
   * @param invoice Invoice payload.
   */
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

  /**
   * Notifies a user who joined a tenant or whose roles changed.
   * @param messageId Id of the event.
   * @param change Membership payload.
   */
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

  /**
   * Notifies the requester that its report is ready or failed.
   * @param messageId Id of the event.
   * @param run Run payload.
   */
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
