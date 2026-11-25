import { billingContract } from '@contracts/billing';
import type { ErrorCatalogEntry } from '@contracts/platform';
import { PLATFORM_LIBRARY_ERROR_CATALOGS } from '@platform/service';
import { tenantMoveErrorCatalog } from '@platform/tenant-move';

/** Error catalogs billing responds with: those of its contract and those of the libraries it uses. */
export const BILLING_ERROR_CATALOGS: readonly (readonly ErrorCatalogEntry[])[] =
  [
    ...Object.values(billingContract.errors),
    ...PLATFORM_LIBRARY_ERROR_CATALOGS,
    tenantMoveErrorCatalog,
  ];
