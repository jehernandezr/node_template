import { validateContract } from '@contracts/platform';
import {
  NotificationPolicy,
  NotificationsLimits,
} from '../constants/notifications.constants.js';
import {
  EmailTemplate,
  NotificationType,
  TemplateParameter,
} from '../enums/notifications.enum.js';
import {
  AppNotificationSchema,
  EmailTemplateSchema,
  TemplateParameterSchema,
} from '../schemas/notification.schema.js';
import { Ids, Now } from './utils/fixtures.js';

const notification = {
  id: Ids.item,
  type: NotificationType.TaskUpdated,
  title: 'Tarea actualizada',
  body: 'Ana cambió el estado de tu tarea.',
  createdAt: Now,
  read: false,
};

describe('notifications schemas', () => {
  it('enforces the title limit', () => {
    expect(
      validateContract(AppNotificationSchema, {
        ...notification,
        title: 'a'.repeat(NotificationsLimits.titleMaxLength),
      }).ok,
    ).toBe(true);
    expect(
      validateContract(AppNotificationSchema, {
        ...notification,
        title: 'a'.repeat(NotificationsLimits.titleMaxLength + 1),
      }).ok,
    ).toBe(false);
    expect(
      validateContract(AppNotificationSchema, { ...notification, title: '' })
        .ok,
    ).toBe(false);
  });

  it('enforces the body limit', () => {
    expect(
      validateContract(AppNotificationSchema, {
        ...notification,
        body: 'b'.repeat(NotificationsLimits.bodyMaxLength + 1),
      }).ok,
    ).toBe(false);
    expect(
      validateContract(AppNotificationSchema, { ...notification, body: '' }).ok,
    ).toBe(false);
  });

  it('keeps the security alert as the only mandatory type', () => {
    expect(NotificationPolicy.mandatoryTypes).toEqual([
      NotificationType.SecurityAlert,
    ]);
  });

  it('lists the email templates with their exact values', () => {
    expect(Object.values(EmailTemplate)).toEqual([
      'verify_email',
      'password_reset',
      'mfa_code',
      'email_change',
      'invitation',
    ]);
    expect(
      validateContract(EmailTemplateSchema, EmailTemplate.MfaCode).ok,
    ).toBe(true);
  });

  it('lists the template parameters with their exact values', () => {
    expect(Object.values(TemplateParameter)).toEqual([
      'code',
      'link',
      'display_name',
      'tenant_name',
      'reference',
    ]);
    expect(validateContract(TemplateParameterSchema, 'nope').ok).toBe(false);
  });
});
