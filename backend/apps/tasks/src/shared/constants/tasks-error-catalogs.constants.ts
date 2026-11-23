import type { ErrorCatalogEntry } from '@contracts/platform';
import { tasksContract } from '@contracts/tasks';
import { PLATFORM_LIBRARY_ERROR_CATALOGS } from '@platform/service';

/** Catálogos de error que tasks responde: los de su contrato y los de las librerías que usa. */
export const TASKS_ERROR_CATALOGS: readonly (readonly ErrorCatalogEntry[])[] = [
  ...Object.values(tasksContract.errors),
  ...PLATFORM_LIBRARY_ERROR_CATALOGS,
];
