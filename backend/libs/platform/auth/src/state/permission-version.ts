/** Versiones de permisos vigentes de un usuario en un tenant. */
export interface PermissionVersion {
  readonly tenant: number;
  readonly user: number;
}
