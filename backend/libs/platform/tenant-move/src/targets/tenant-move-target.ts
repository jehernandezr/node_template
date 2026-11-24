/** Dónde queda un tenant en un servicio al trasladarlo a un grupo. */
export interface TenantMoveTarget {
  readonly group: string;
  readonly region: string;
  /** Shard lógico del servicio en ese grupo. */
  readonly shard: string;
}
