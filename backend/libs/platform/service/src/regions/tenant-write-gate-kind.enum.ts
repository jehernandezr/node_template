/** Dónde se cierra la compuerta de escritura de un tenant durante su traslado (`TENANT_WRITE_GATE`). */
export enum TenantWriteGateKind {
  /** El placement del tenant en el directorio pasa a `Migrating`. Por defecto. */
  Directory = 'directory',
  /** Un candado en el Valkey del servicio. */
  Valkey = 'valkey',
}
