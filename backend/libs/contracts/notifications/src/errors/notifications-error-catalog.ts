import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { NotificationsErrorCode as C } from '../enums/identifiers.enum.js';

const pub = ErrorSpecs.pub;
const internal = ErrorSpecs.internal;

/** Catalog of the notifications codes. */
export const notificationsErrorCatalog = defineErrorCatalog(C, {
  [C.InboxNotFound]: pub(
    404,
    false,
    'The notification does not exist in the user inbox.',
  ),
  [C.PreferencesInvalidQuietHours]: pub(
    400,
    false,
    'The quiet hours are invalid: the time zone is missing or the hours do not have the HH:mm format.',
  ),
  [C.EmailRecipientSuppressed]: internal(
    422,
    false,
    'The recipient is on the suppression list (bounce or complaint) and is not sent email.',
  ),
  [C.EmailTemplateUnknown]: internal(
    400,
    false,
    'The requested email template does not exist.',
  ),
  [C.EmailTemplateParameterMissing]: internal(
    400,
    false,
    'A required template value is missing: the email is not sent incomplete. The details carry parameter.',
  ),
  [C.EmailInProgress]: internal(
    409,
    true,
    'Another send of the same email is in progress; it is retried without sending it again.',
  ),
  [C.RealtimeUnauthenticated]: pub(
    401,
    false,
    'The realtime connection does not carry a valid credential.',
  ),
});
