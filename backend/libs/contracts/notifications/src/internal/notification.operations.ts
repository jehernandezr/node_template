import { Compensation, defineOperation } from '@contracts/platform';
import {
  NotificationsErrorCode,
  NotificationsOperation,
} from '../enums/identifiers.enum.js';
import {
  EraseNotificationsUserInputSchema,
  EraseNotificationsUserResultSchema,
  NotifyUserInputSchema,
  NotifyUserResultSchema,
  SendEmailInputSchema,
  SendEmailResultSchema,
} from '../schemas/notification.schema.js';

/**
 * Sends a transactional email. The one-time code travels through the internal
 * API and never through the event bus.
 */
export const SendEmailOperation = defineOperation({
  id: NotificationsOperation.SendMessage,
  input: SendEmailInputSchema,
  output: SendEmailResultSchema,
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason: 'An email already sent cannot be withdrawn.',
  errors: [
    NotificationsErrorCode.EmailRecipientSuppressed,
    NotificationsErrorCode.EmailTemplateUnknown,
    NotificationsErrorCode.EmailTemplateParameterMissing,
  ],
  timeoutMs: 6_000,
  description:
    'Sends a transactional email. The one-time code travels through the internal API and never through the bus.',
});

/**
 * Delivers a notification to a user through their channels. Runs after the
 * saga pivot and is retried with the same `notificationId`.
 */
export const NotifyUserOperation = defineOperation({
  id: NotificationsOperation.NotifyUser,
  input: NotifyUserInputSchema,
  output: NotifyUserResultSchema,
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason:
    'A delivered notification is not withdrawn; the step runs after the saga pivot and is retried with the same notificationId.',
  errors: [],
  timeoutMs: 6_000,
  description: 'Delivers a notification to a user through their channels.',
});

/** Deletes a user's notifications, preferences and deliveries. */
export const EraseNotificationsUserDataOperation = defineOperation({
  id: NotificationsOperation.EraseUserData,
  input: EraseNotificationsUserInputSchema,
  output: EraseNotificationsUserResultSchema,
  idempotent: true,
  compensatedBy: Compensation.None,
  compensationReason:
    'Erasing the user data is irreversible and runs after the saga pivot.',
  errors: [],
  timeoutMs: 6_000,
  description:
    'Deletes the notifications, preferences and deliveries of a user.',
});
