/** Índice global de slugs en el catálogo (`tenant_lookup`). */
export abstract class TenantDirectory {
  /** Reserva el slug. Devuelve `false` si ya es de otro tenant. */
  abstract reserve(
    slug: string,
    tenantId: string,
    region: string,
  ): Promise<boolean>;

  abstract release(slug: string, tenantId: string): Promise<void>;

  /** El slug del tenant, si lo tiene reservado. */
  abstract slugOf(tenantId: string): Promise<string | undefined>;
}
