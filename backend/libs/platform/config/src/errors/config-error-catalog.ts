import { defineErrorCatalog, ErrorSpecs } from '@contracts/platform';
import { ConfigErrorCode } from './config-error-code.enum.js';

/** Catalog of the `@platform/config` codes; none reaches the client. */
export const configErrorCatalog = defineErrorCatalog(ConfigErrorCode, {
  [ConfigErrorCode.Invalid]: ErrorSpecs.internal(
    500,
    false,
    'The environment configuration does not match the schema.',
  ),
});
