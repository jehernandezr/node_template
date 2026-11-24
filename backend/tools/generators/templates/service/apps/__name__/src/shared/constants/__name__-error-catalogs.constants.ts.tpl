import type { ErrorCatalogEntry } from '@contracts/platform';
import { __nameCamel__Contract } from '@contracts/__name__';
import { PLATFORM_LIBRARY_ERROR_CATALOGS } from '@platform/service';
import { tenantMoveErrorCatalog } from '@platform/tenant-move';

/** Catálogos de error que __name__ responde: los de su contrato y los de las librerías que usa. */
export const __NAME___ERROR_CATALOGS: readonly (readonly ErrorCatalogEntry[])[] =
  [
    ...Object.values(__nameCamel__Contract.errors),
    ...PLATFORM_LIBRARY_ERROR_CATALOGS,
    tenantMoveErrorCatalog,
  ];
