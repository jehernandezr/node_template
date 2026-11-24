import type { ErrorCatalogEntry } from '@contracts/platform';
import { reportsContract } from '@contracts/reports';
import { PLATFORM_LIBRARY_ERROR_CATALOGS } from '@platform/service';
import { tenantMoveErrorCatalog } from '@platform/tenant-move';

/** Catálogos de error que reports responde: los de su contrato y los de las librerías que usa. */
export const REPORTS_ERROR_CATALOGS: readonly (readonly ErrorCatalogEntry[])[] =
  [
    ...Object.values(reportsContract.errors),
    ...PLATFORM_LIBRARY_ERROR_CATALOGS,
    tenantMoveErrorCatalog,
  ];
