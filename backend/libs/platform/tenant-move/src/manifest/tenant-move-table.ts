import type { TenantMoveSelectorKind } from './tenant-move-selector-kind.enum.js';

/** Filas de una tabla con una columna propia del tenant. */
export interface TenantColumnSelector {
  readonly kind: TenantMoveSelectorKind.TenantColumn;
  readonly column: string;
}

/** Filas de una tabla cuya `column` apunta a `parentColumn` de una fila del tenant en `parent`. */
export interface ViaParentSelector {
  readonly kind: TenantMoveSelectorKind.ViaParent;
  readonly parent: string;
  readonly column: string;
  readonly parentColumn: string;
}

/** Una tabla del shard que el traslado copia, y cómo se llega a las filas del tenant. */
export interface TenantMoveTable {
  readonly table: string;
  readonly selector: TenantColumnSelector | ViaParentSelector;
  /**
   * Columna que guarda la región del tenant. Al pivotar, el traslado la cambia a la región de destino en la copia,
   * antes de abrir las escrituras: después ya no podría, porque la región de origen deja de enrutar al tenant.
   */
  readonly regionColumn?: string;
}
