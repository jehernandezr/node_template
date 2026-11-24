import { billingContract } from '@contracts/billing';
import type { ErrorCatalogEntry } from '@contracts/platform';
import { PLATFORM_LIBRARY_ERROR_CATALOGS } from '@platform/service';
import { tenantMoveErrorCatalog } from '@platform/tenant-move';

/** Catálogos de error que billing responde: los de su contrato y los de las librerías que usa. */
export const BILLING_ERROR_CATALOGS: readonly (readonly ErrorCatalogEntry[])[] =
  [
    ...Object.values(billingContract.errors),
    ...PLATFORM_LIBRARY_ERROR_CATALOGS,
    tenantMoveErrorCatalog,
  ];
