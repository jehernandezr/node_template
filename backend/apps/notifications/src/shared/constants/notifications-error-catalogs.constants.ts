import type { ErrorCatalogEntry } from '@contracts/platform';
import { notificationsContract } from '@contracts/notifications';
import { PLATFORM_LIBRARY_ERROR_CATALOGS } from '@platform/service';

/** Catálogos de error que notifications responde: los de su contrato y los de las librerías que usa. */
export const NOTIFICATIONS_ERROR_CATALOGS: readonly (readonly ErrorCatalogEntry[])[] =
  [
    ...Object.values(notificationsContract.errors),
    ...PLATFORM_LIBRARY_ERROR_CATALOGS,
  ];
