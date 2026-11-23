import { identityContract } from '@contracts/identity';
import type { ErrorCatalogEntry } from '@contracts/platform';
import { quotasErrorCatalog } from '@platform/quotas';
import { PLATFORM_LIBRARY_ERROR_CATALOGS } from '@platform/service';

/** Catálogos de error que identity responde: los de su contrato y los de las librerías que usa. */
export const IDENTITY_ERROR_CATALOGS: readonly (readonly ErrorCatalogEntry[])[] =
  [
    ...Object.values(identityContract.errors),
    ...PLATFORM_LIBRARY_ERROR_CATALOGS,
    quotasErrorCatalog,
  ];
