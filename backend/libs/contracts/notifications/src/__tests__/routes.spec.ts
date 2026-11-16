import {
  AccessKind,
  HttpMethod,
  PageQuerySchema,
  validateContract,
} from '@contracts/platform';
import { SessionGuardErrors } from '@contracts/identity';
import { notificationsContract } from '../contract.js';
import {
  NotificationsErrorCode,
  NotificationsRoute,
} from '../enums/identifiers.enum.js';
import {
  NotificationChannel,
  NotificationType,
} from '../enums/notifications.enum.js';
import { MarkAllReadRoute, MarkReadRoute } from '../http/inbox.routes.js';
import {
  GetPreferencesRoute,
  SavePreferencesRoute,
} from '../http/preferences.routes.js';
import { NotificationPreferencesSchema } from '../schemas/notification.schema.js';

const validPreferences = {
  enabled: [
    {
      type: NotificationType.TaskUpdated,
      channels: [NotificationChannel.InApp, NotificationChannel.Push],
    },
  ],
  quietStart: '22:00',
  quietEnd: '07:00',
  timezone: 'America/Bogota',
};

describe('notifications routes', () => {
  it.each([
    [NotificationsRoute.ListInbox, HttpMethod.Get, '/v1/notifications', 200],
    [
      NotificationsRoute.GetUnreadCount,
      HttpMethod.Get,
      '/v1/notifications/unread-count',
      200,
    ],
    [
      NotificationsRoute.MarkRead,
      HttpMethod.Post,
      '/v1/notifications/{notificationId}/read',
      204,
    ],
    [
      NotificationsRoute.MarkAllRead,
      HttpMethod.Post,
      '/v1/notifications/read-all',
      204,
    ],
    [
      NotificationsRoute.GetPreferences,
      HttpMethod.Get,
      '/v1/notification-preferences',
      200,
    ],
    [
      NotificationsRoute.SavePreferences,
      HttpMethod.Put,
      '/v1/notification-preferences',
      204,
    ],
  ])('serves %s as %s %s with status %i', (id, method, path, successStatus) => {
    const route = Object.values(notificationsContract.routes).find(
      (candidate) => candidate.id === id,
    );
    expect(route).toBeDefined();
    expect(route?.method).toBe(method);
    expect(route?.path).toBe(path);
    expect(route?.successStatus).toBe(successStatus);
    expect(route?.access.kind).toBe(AccessKind.Authenticated);
    expect(route?.access.permissions).toBeUndefined();
    for (const code of SessionGuardErrors) {
      expect(route?.errors).toContain(code);
    }
  });

  it('reads the notification id from the path on mark read', () => {
    expect(MarkReadRoute.pathParams).toEqual(['notificationId']);
    expect(MarkReadRoute.response).toBeNull();
    expect(MarkReadRoute.errors).toContain(
      NotificationsErrorCode.InboxNotFound,
    );
  });

  it('answers 204 without body on mark all read', () => {
    expect(MarkAllReadRoute.response).toBeNull();
    expect(MarkAllReadRoute.successStatus).toBe(204);
  });

  it('declares the quiet hours code on save preferences', () => {
    expect(SavePreferencesRoute.errors).toContain(
      NotificationsErrorCode.PreferencesInvalidQuietHours,
    );
    expect(GetPreferencesRoute.response).toBe(NotificationPreferencesSchema);
  });

  it('accepts valid preferences', () => {
    expect(
      validateContract(NotificationPreferencesSchema, validPreferences).ok,
    ).toBe(true);
  });

  it.each(['24:00', '7:00', '22:60'])(
    'rejects the quiet hour %s',
    (quietStart) => {
      expect(
        validateContract(NotificationPreferencesSchema, {
          ...validPreferences,
          quietStart,
        }).ok,
      ).toBe(false);
    },
  );

  it('rejects an empty timezone', () => {
    expect(
      validateContract(NotificationPreferencesSchema, {
        ...validPreferences,
        timezone: '',
      }).ok,
    ).toBe(false);
  });

  it('rejects more than four preference entries', () => {
    const entry = validPreferences.enabled[0];
    expect(
      validateContract(NotificationPreferencesSchema, {
        ...validPreferences,
        enabled: [entry, entry, entry, entry, entry],
      }).ok,
    ).toBe(false);
  });

  it('rejects an unknown preference field', () => {
    expect(
      validateContract(NotificationPreferencesSchema, {
        ...validPreferences,
        digest: true,
      }).ok,
    ).toBe(false);
  });

  it('rejects a page size above the limit', () => {
    expect(validateContract(PageQuerySchema, { limit: 500 }).ok).toBe(false);
    expect(validateContract(PageQuerySchema, { limit: 20 }).ok).toBe(true);
  });
});
