import type { ErrorCatalogEntry } from '@contracts/platform';
import { tasksContract } from '@contracts/tasks';
import { quotasErrorCatalog } from '@platform/quotas';
import { PLATFORM_LIBRARY_ERROR_CATALOGS } from '@platform/service';
import { tenantMoveErrorCatalog } from '@platform/tenant-move';

/** Error catalogs tasks responds with: those of its contract and those of the libraries it uses. */
export const TASKS_ERROR_CATALOGS: readonly (readonly ErrorCatalogEntry[])[] = [
  ...Object.values(tasksContract.errors),
  ...PLATFORM_LIBRARY_ERROR_CATALOGS,
  tenantMoveErrorCatalog,
  quotasErrorCatalog,
];
