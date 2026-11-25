import type { ErrorCatalogEntry } from '@contracts/platform';
import { reportsContract } from '@contracts/reports';
import { PLATFORM_LIBRARY_ERROR_CATALOGS } from '@platform/service';
import { tenantMoveErrorCatalog } from '@platform/tenant-move';

/** Error catalogs reports responds with: those of its contract and those of the libraries it uses. */
export const REPORTS_ERROR_CATALOGS: readonly (readonly ErrorCatalogEntry[])[] =
  [
    ...Object.values(reportsContract.errors),
    ...PLATFORM_LIBRARY_ERROR_CATALOGS,
    tenantMoveErrorCatalog,
  ];
