import type { DirectoryWriteResult } from '../model/directory-write-result.enum.js';
import type { TenantPlacement } from '../model/tenant-placement.js';

/**
 * Lado de escritura del directorio, usado por las sagas de alta y de traslado.
 * Toda escritura es condicional, así que dos sagas concurrentes nunca ganan a la vez:
 *
 * - `putPlacement` compara y fija sobre `version`. Crear un tenant
 *   (`expectedVersion` indefinido) solo funciona si no tiene fila; actualizar
 *   solo funciona si la versión guardada es `expectedVersion`, y el placement
 *   nuevo lleva `expectedVersion + 1`.
 * - La exclusividad del shard se comprueba en el mismo paso atómico que la
 *   escritura (en Postgres, una transacción que bloquea las filas de los shards
 *   destino con `SELECT ... FOR UPDATE` antes de contar sus tenants, o una
 *   restricción de exclusión). Una política pura no ve un placement concurrente;
 *   esta comprobación impide que dos tenants dedicados tomen el mismo shard vacío.
 *
 * Tras una actualización exitosa, quien escribe llama a
 * `ShardRouter.invalidate(tenantId, { version })`, que además publica
 * `ShardingEvent.ShardDirectoryChanged` cuando el router tiene un publicador.
 */
export abstract class DirectoryWriter {
  /** Placement de un tenant leído del primario, la base de una escritura condicional. */
  abstract readPlacement(
    tenantId: string,
  ): Promise<TenantPlacement | undefined>;

  /** Placements de una región, la entrada de una `ShardPlacementPolicy`. */
  abstract listPlacements(region: string): Promise<readonly TenantPlacement[]>;

  /**
   * @param placement Placement nuevo. Su versión es 1 para un tenant nuevo y `expectedVersion + 1` en los demás casos.
   * @param expectedVersion Versión que leyó quien llama, o `undefined` para crear el tenant.
   */
  abstract putPlacement(
    placement: TenantPlacement,
    expectedVersion: number | undefined,
  ): Promise<DirectoryWriteResult>;

  /**
   * Borra la fila de un tenant solo si su versión guardada es `expectedVersion`. Es la reversa del alta, antes de
   * que el tenant tenga datos.
   * @returns `Written` si borró, `VersionConflict` si la fila cambió o ya no existe.
   */
  abstract deletePlacement(
    tenantId: string,
    expectedVersion: number,
  ): Promise<DirectoryWriteResult>;
}
