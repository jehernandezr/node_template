import {
  Access,
  defineRoute,
  HttpMethod,
  PlatformErrorCode,
} from '@contracts/platform';
import { SessionGuardErrors } from '@contracts/identity';
import {
  NotificationsErrorCode,
  NotificationsRoute,
} from '../enums/identifiers.enum.js';
import { NotificationPreferencesSchema } from '../schemas/notification.schema.js';

const guard = SessionGuardErrors;

/** `GET /v1/notification-preferences`: the user's preferences. */
export const GetPreferencesRoute = defineRoute({
  id: NotificationsRoute.GetPreferences,
  method: HttpMethod.Get,
  path: '/v1/notification-preferences',
  response: NotificationPreferencesSchema,
  errors: guard,
  access: Access.authenticated(),
  description: 'Returns the notification preferences of the user.',
});

/** `PUT /v1/notification-preferences`: replaces the user's preferences. */
export const SavePreferencesRoute = defineRoute({
  id: NotificationsRoute.SavePreferences,
  method: HttpMethod.Put,
  path: '/v1/notification-preferences',
  request: NotificationPreferencesSchema,
  errors: [
    ...guard,
    PlatformErrorCode.ValidationInvalidInput,
    NotificationsErrorCode.PreferencesInvalidQuietHours,
  ],
  access: Access.authenticated(),
  description: 'Saves the notification preferences of the user.',
});
