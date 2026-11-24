/** Cómo se llega a las filas de un tenant en una tabla. */
export enum TenantMoveSelectorKind {
  /** La tabla tiene una columna con el id del tenant. */
  TenantColumn = 'tenant-column',
  /** Las filas cuelgan de una tabla padre del mismo manifiesto. */
  ViaParent = 'via-parent',
}
