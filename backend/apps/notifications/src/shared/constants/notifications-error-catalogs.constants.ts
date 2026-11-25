import type { ErrorCatalogEntry } from '@contracts/platform';
import { notificationsContract } from '@contracts/notifications';
import { PLATFORM_LIBRARY_ERROR_CATALOGS } from '@platform/service';
import { tenantMoveErrorCatalog } from '@platform/tenant-move';

/** Error catalogs notifications responds with: those of its contract and those of the libraries it uses. */
export const NOTIFICATIONS_ERROR_CATALOGS: readonly (readonly ErrorCatalogEntry[])[] =
  [
    ...Object.values(notificationsContract.errors),
    ...PLATFORM_LIBRARY_ERROR_CATALOGS,
    tenantMoveErrorCatalog,
  ];
