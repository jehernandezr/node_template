/** Un usuario dentro de un tenant, con sus grupos y su versión de permisos en ese tenant. */
export interface Membership {
  readonly id: string;
  readonly tenantId: string;
  readonly userId: string;
  readonly homeTenantId: string;
  readonly groupIds: readonly string[];
  /** Sube cuando cambian los grupos de este usuario: es la segunda parte del claim `pv`. */
  readonly permissionVersion: number;
  readonly joinedAt: Date;
  readonly version?: number;
}
