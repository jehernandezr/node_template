import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { ValkeyErrorCode } from './valkey-error-code.enum.js';

/** Catálogo de los códigos de `@platform/adapters-valkey`; ninguno llega al cliente. */
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
