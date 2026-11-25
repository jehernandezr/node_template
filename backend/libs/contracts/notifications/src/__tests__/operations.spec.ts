import { Compensation, validateContract } from '@contracts/platform';
import { notificationsContract } from '../contract.js';
import {
  NotificationsErrorCode,
  NotificationsOperation,
} from '../enums/identifiers.enum.js';
import {
  EmailTemplate,
  NotificationType,
  TemplateParameter,
} from '../enums/notifications.enum.js';
import {
  EraseNotificationsUserDataOperation,
  NotifyUserOperation,
  SendEmailOperation,
} from '../internal/notification.operations.js';
import {
  NotifyUserInputSchema,
  SendEmailInputSchema,
} from '../schemas/notification.schema.js';
import { Ids, UuidV4 } from './utils/fixtures.js';

const operations = Object.values(notificationsContract.operations);
const byId = new Map(operations.map((op) => [op.id, op]));

const user = { userId: Ids.user, homeTenantId: Ids.tenant };

const validEmail = {
  messageId: Ids.item,
  template: EmailTemplate.MfaCode,
  to: 'ana@example.com',
  parameters: [{ name: TemplateParameter.Code, value: '123456' }],
};

describe('notifications internal operations', () => {
  it('uses every NotificationsOperation value exactly once', () => {
    const ids = operations.map((op) => op.id);
    expect([...ids].sort()).toEqual(
      Object.values(NotificationsOperation).sort(),
    );
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(operations.map((op) => [op.id, op] as const))(
    'makes %s idempotent',
    (_id, op) => {
      expect(op.idempotent).toBe(true);
    },
  );

  it('has no read operation', () => {
    expect(operations.filter((op) => !op.mutating)).toEqual([]);
  });

  it('declares no compensation for its own operations, with a reason', () => {
    for (const op of [
      SendEmailOperation,
      NotifyUserOperation,
      EraseNotificationsUserDataOperation,
    ]) {
      expect(op.compensatedBy).toBe(Compensation.None);
      expect(op.compensationReason?.trim().length).toBeGreaterThan(0);
    }
  });

  it('declares no compensation for abort and cleanup, with a reason', () => {
    for (const id of [
      NotificationsOperation.TenantMoveAbort,
      NotificationsOperation.TenantMoveCleanup,
    ]) {
      expect(byId.get(id)?.compensatedBy).toBe(Compensation.None);
      expect(byId.get(id)?.compensationReason?.trim().length).toBeGreaterThan(
        0,
      );
    }
  });

  it('compensates sync and finalize of the tenant move with the abort', () => {
    expect(byId.get(NotificationsOperation.TenantMoveSync)?.compensatedBy).toBe(
      NotificationsOperation.TenantMoveAbort,
    );
    expect(
      byId.get(NotificationsOperation.TenantMoveFinalize)?.compensatedBy,
    ).toBe(NotificationsOperation.TenantMoveAbort);
  });

  it('accepts a valid email and rejects the invalid ones', () => {
    expect(validateContract(SendEmailInputSchema, validEmail).ok).toBe(true);
    expect(
      validateContract(SendEmailInputSchema, { ...validEmail, to: 'nope' }).ok,
    ).toBe(false);
    expect(
      validateContract(SendEmailInputSchema, {
        ...validEmail,
        parameters: Array.from({ length: 11 }, () => ({
          name: TemplateParameter.Code,
          value: '1',
        })),
      }).ok,
    ).toBe(false);
    expect(
      validateContract(SendEmailInputSchema, {
        ...validEmail,
        messageId: UuidV4,
      }).ok,
    ).toBe(false);
  });

  it('declares the internal codes on the email send', () => {
    expect(SendEmailOperation.errors).toEqual([
      NotificationsErrorCode.EmailRecipientSuppressed,
      NotificationsErrorCode.EmailTemplateUnknown,
      NotificationsErrorCode.EmailTemplateParameterMissing,
    ]);
  });

  it('accepts a valid notify and rejects a user without home tenant', () => {
    const input = {
      notificationId: Ids.item,
      user,
      tenantId: Ids.tenant,
      type: NotificationType.SecurityAlert,
      parameters: [],
    };
    expect(validateContract(NotifyUserInputSchema, input).ok).toBe(true);
    expect(
      validateContract(NotifyUserInputSchema, {
        ...input,
        user: { userId: Ids.user },
      }).ok,
    ).toBe(false);
  });
});
