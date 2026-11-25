import { identityContract } from '@contracts/identity';
import type { ErrorCatalogEntry } from '@contracts/platform';
import { quotasErrorCatalog } from '@platform/quotas';
import { PLATFORM_LIBRARY_ERROR_CATALOGS } from '@platform/service';
import { tenantMoveErrorCatalog } from '@platform/tenant-move';

/** Error catalogs identity responds with: those of its contract and those of the libraries it uses. */
export const IDENTITY_ERROR_CATALOGS: readonly (readonly ErrorCatalogEntry[])[] =
  [
    ...Object.values(identityContract.errors),
    ...PLATFORM_LIBRARY_ERROR_CATALOGS,
    tenantMoveErrorCatalog,
    quotasErrorCatalog,
  ];
