import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { ValkeyErrorCode } from './valkey-error-code.enum.js';

/** Catalog of the `@platform/adapters-valkey` codes; none reaches the client. */
export const valkeyErrorCatalog = defineErrorCatalog(ValkeyErrorCode, {
  [ValkeyErrorCode.CommandFailed]: ErrorSpecs.internal(
    503,
    true,
    'Falló un comando de Valkey.',
  ),
  [ValkeyErrorCode.UnexpectedReply]: ErrorSpecs.internal(
    500,
    false,
    'Valkey respondió con una forma inesperada.',
  ),
});
