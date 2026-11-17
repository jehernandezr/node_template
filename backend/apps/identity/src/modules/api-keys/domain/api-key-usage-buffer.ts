/** Último uso de una API key, pendiente de guardar en su shard. */
export interface ApiKeyUsage {
  readonly tenantId: string;
  readonly apiKeyId: string;
  readonly lastUsedAt: Date;
}

/**
 * Acumula el último uso de cada API key fuera de la base: una key se usa en cada petición y escribir su fila
 * cada vez cargaría el shard de su tenant. Un job vuelca lo acumulado.
 */
export abstract class ApiKeyUsageBuffer {
  abstract record(usage: ApiKeyUsage): Promise<void>;
  /** Devuelve lo acumulado y lo vacía; lo que llegue después queda para la siguiente vez. */
  abstract drain(): Promise<readonly ApiKeyUsage[]>;
}
