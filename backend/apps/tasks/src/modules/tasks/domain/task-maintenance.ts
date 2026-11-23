import type { UserRef } from '@contracts/platform';

/** Mantenimiento de las tareas de todos los tenants de todos los shards. */
export abstract class TaskMaintenance {
  /** Elimina las tareas borradas antes de `cutoff` y devuelve cuántas. */
  abstract purgeDeletedBefore(cutoff: Date): Promise<number>;

  /** Reemplaza al usuario como autor o último editor por `replacement` y devuelve las tareas tocadas. */
  abstract replaceAuthor(userId: string, replacement: UserRef): Promise<number>;
}
