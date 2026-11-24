/** Índice global de slugs en el catálogo (`tenant_lookup`). */
export abstract class TenantDirectory {
  /** Reserva el slug. Devuelve `false` si ya es de otro tenant. */
  abstract reserve(
    slug: string,
    tenantId: string,
    region: string,
  ): Promise<boolean>;

  abstract release(slug: string, tenantId: string): Promise<void>;

  /** Si algún tenant tiene reservado el slug. */
  abstract isTaken(slug: string): Promise<boolean>;

  /** El slug del tenant, si lo tiene reservado. */
  abstract slugOf(tenantId: string): Promise<string | undefined>;

  /** Apunta el slug del tenant a su región nueva después de un traslado. */
  abstract relocate(tenantId: string, region: string): Promise<void>;
}
