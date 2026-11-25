import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { MessagingErrorCode } from './messaging-error-code.enum.js';

/**
 * Catalog of the `@platform/messaging` codes. The codes are internal: the
 * central catalog does not declare them.
 */
export const messagingErrorCatalog = defineErrorCatalog(MessagingErrorCode, {
  [MessagingErrorCode.InvalidEnvelope]: ErrorSpecs.internal(
    400,
    false,
    'The message envelope does not match the expected CloudEvents format.',
  ),
  [MessagingErrorCode.InvalidPayload]: ErrorSpecs.internal(
    400,
    false,
    'The message payload does not match its contract.',
  ),
  [MessagingErrorCode.InvalidRetryPolicy]: ErrorSpecs.internal(
    500,
    false,
    'The consumer retry policy is invalid.',
  ),
  [MessagingErrorCode.InvalidTopology]: ErrorSpecs.internal(
    500,
    false,
    'The messaging topology is invalid.',
  ),
  [MessagingErrorCode.UnknownRoute]: ErrorSpecs.internal(
    500,
    false,
    'There is no route configured for the message type.',
  ),
  [MessagingErrorCode.UnknownQueue]: ErrorSpecs.internal(
    500,
    false,
    'The given queue does not exist in the topology.',
  ),
  [MessagingErrorCode.DuplicateHandler]: ErrorSpecs.internal(
    500,
    false,
    'Two handlers serve the same message type on the same queue.',
  ),
  [MessagingErrorCode.PermanentError]: ErrorSpecs.internal(
    500,
    false,
    'The handler failed permanently; the message goes to the dead-letter queue.',
  ),
  [MessagingErrorCode.PayloadTooLarge]: ErrorSpecs.internal(
    413,
    false,
    'The message exceeds the maximum allowed size.',
  ),
  [MessagingErrorCode.TenantMismatch]: ErrorSpecs.internal(
    403,
    false,
    'The message tenant does not match the expected one.',
  ),
  [MessagingErrorCode.IdempotencyConflict]: ErrorSpecs.internal(
    409,
    false,
    'A message id was reused with different content.',
  ),
  [MessagingErrorCode.InvalidOptions]: ErrorSpecs.internal(
    500,
    false,
    'The messaging options are not valid.',
  ),
  [MessagingErrorCode.TransactionRequired]: ErrorSpecs.internal(
    500,
    false,
    'The outbox requires an open transaction to store the message.',
  ),
  [MessagingErrorCode.TransportFailed]: ErrorSpecs.internal(
    503,
    true,
    'The messaging transport (SNS or SQS) did not respond or rejected the call.',
  ),
});
