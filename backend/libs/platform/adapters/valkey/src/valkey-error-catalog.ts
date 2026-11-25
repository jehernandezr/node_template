import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { ValkeyErrorCode } from './valkey-error-code.enum.js';

/** Catalog of the `@platform/adapters-valkey` codes; none reaches the client. */
export const valkeyErrorCatalog = defineErrorCatalog(ValkeyErrorCode, {
  [ValkeyErrorCode.CommandFailed]: ErrorSpecs.internal(
    503,
    true,
    'A Valkey command failed.',
  ),
  [ValkeyErrorCode.UnexpectedReply]: ErrorSpecs.internal(
    500,
    false,
    'Valkey replied with an unexpected shape.',
  ),
});
